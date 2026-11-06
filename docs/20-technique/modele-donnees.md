# Modèle de données — état de l’implémentation

**Identifiant :** TEC-RCWM-002  
**Version du document :** 1.3  
**Dernière mise à jour :** 2026-11-04  
**Statut :** En revue  
**Environnement de référence :** branche `develop`, état décrit au 2026-11-03  
**Périmètre :** structure SQLite, entités persistées et frontières de persistance  
**Références :** PR #9 et PR #10

## Séparation des données

Une installation peut gérer plusieurs inventaires locaux indépendants. Chaque inventaire métier est un fichier SQLite distinct. Le registre des inventaires est conservé séparément dans `inventories.json`, sous le répertoire utilisateur de l’application. Il contient notamment l’identifiant applicatif, le nom, le chemin géré par l’application, la date de création, la dernière utilisation, l’identifiant actif et l’identifiant du dernier inventaire utilisé.

Les chemins et opérations de fichiers restent dans le processus principal Electron. À l’import, le fichier sélectionné est copié dans le répertoire applicatif avant ouverture. La copie est contrôlée en lecture seule (intégrité SQLite, tables métier attendues et colonnes de base) avant que le repository ne l’ouvre en écriture et applique ses migrations additives. Une copie incompatible est supprimée et n’est pas inscrite au registre ; le fichier source reste intact. Le renderer passe par l’API desktop typée et IPC ; il ne doit pas accéder directement à SQLite ou au système de fichiers.

## Entités métier SQLite

- `ComponentReference` / table `component_references` : référence catalogue, catégorie, marque/modèle/description, mode de suivi, propriétés radio, motorisation et batterie typées (connecteur, taux de décharge, dimensions et poids facultatifs), attributs, chemin de photo, URL marchand distincte, archivage et date de création.
- `StockItem` / table `stock_items` : exemplaire physique, code inventaire unique, numéro de série, état, emplacement, avion/projet éventuel, nom TX16, identifiant de l’émetteur lié et compatibilités avion éventuelles (notamment pour les batteries).
- `StockLot` / table `stock_lots` : quantité entière non négative, unité et emplacement, rattachés à une référence.
- `Aircraft` / table `aircraft` : nom, constructeur, modèle, notes, immatriculation UAF et chemin/URL de photo facultatifs ; type d'aéronef, état opérationnel, cycle de vie et indicateur de favori.
- `Project` / table `projects` : nom, statut et notes.
- `StockMovement` / table `stock_movements` : événement daté lié à une référence et, selon le cas, à un exemplaire, un lot, un avion ou un projet.
- `AircraftLogbookEvent` / table `aircraft_logbook` : événement facultatif rattaché à un aéronef (type, date, commentaire et nombre de vols facultatifs).

Le snapshot d’un inventaire regroupe références, exemplaires, lots, avions, projets, mouvements et événements de journal de bord.

### Vente et retrait définitif des aéronefs

Les modifications ordinaires d'une fiche ne déclenchent aucune récupération automatique lorsqu'un aéronef passe à l'état « Hors service ». La vente et le retrait sont exécutés par une commande dédiée. Le service métier exige une destination pour chaque exemplaire encore affecté : retour dans l'inventaire, vente avec l'aéronef, vente séparée ou mise au rebut. La destination « vendu avec l'aéronef » est réservée à une vente.

Le repository SQLite persiste dans une transaction unique le cycle de vie final, les statuts et désaffectations des exemplaires, les mouvements correspondants et l'événement de journal (vente ou retrait). Les exemplaires et références catalogue ne sont jamais supprimés. Une erreur annule toute l'opération. Les batteries ne sont pas concernées car elles ne sont pas affectées.

### Journal de bord des aéronefs

La table `aircraft_logbook` stocke séparément les événements de chaque aéronef. La migration crée cette table de façon additive. Les événements sont lus par date croissante ; la modification met à jour l'événement existant. La suppression d'un événement ou la modification du journal ne génère aucun mouvement de stock et ne modifie aucun état de l'aéronef.

### Classification des aéronefs

La table `aircraft` porte les attributs `aircraft_type` (défaut `other`), `operational_state` (défaut `flight-ready`), `lifecycle_state` (défaut `active`), `favorite` (défaut `0`) et `photo_path` (facultatif). La migration ajoute ces colonnes sans réécrire les aéronefs existants. Les valeurs par défaut garantissent la compatibilité des anciennes bases ; les favoris sont limités à quatre par inventaire par le service métier.

Une migration additive ajoute `merchant_url` à `component_references`. Les images choisies depuis l'application sont copiées dans `<userData>/data/images` via le dialogue de fichiers Electron. Le chemin est enregistré avec la référence ou l'aéronef, indépendamment de `merchant_url`. Ce répertoire se trouve dans les données persistantes de l'utilisateur, hors du répertoire d'installation.

## Catégories et compatibilité

Les catégories principales exposées par le catalogue sont `motor`, `esc`, `radio`, `servo`, `battery`, `supplies`, `tool` et `other`. Le type accepte encore plusieurs valeurs historiques pour compatibilité. À l’initialisation SQLite, les anciennes catégories `receiver` sont converties en `radio` avec `radio_type='receiver'`, et `connector`, `control`, `structure`, `material`, `construction` sont regroupées sous `supplies`.

## Règles métier structurantes

- Une référence catalogue n’est pas un exemplaire physique.
- Les exemplaires ont un code inventaire unique ; les noms TX16 des récepteurs sont uniques sans distinction de casse.
- Un récepteur peut être lié à un émetteur ; les émetteurs ne sont pas affectés directement aux avions dans ce périmètre.
- Un exemplaire peut être installé sur un avion ou réservé à un projet ; une seule affectation active est permise par les règles du service métier.
- Les fournitures sont suivies par quantité et unité ; les quantités de lot sont entières et non négatives.
- Les outils et servos sont suivis individuellement. Un outil possède le statut Disponible, Prêté ou En réparation.
- Les batteries sont suivies individuellement ; leurs compatibilités avion sont stockées séparément de toute affectation. Leurs caractéristiques facultatives (connecteur, taux de décharge en C, dimensions en mm et poids en g) sont portées par la référence catalogue. Une batterie ne peut pas être affectée à un avion ou à un projet.
- Les mouvements sont append-only dans le flux métier courant ; les suppressions/ajustements ne doivent pas effacer les événements antérieurs.
- Une référence dépendante est archivée pour préserver l’historique.
- Les migrations de schéma sont additives et doivent préserver les bases existantes. Les colonnes `component_references.battery_connector`, `battery_discharge_rate_c`, `battery_dimensions_mm` et `battery_weight_g` sont ajoutées de façon additive ; les batteries déjà enregistrées restent valides sans ces caractéristiques. La colonne `stock_items.compatible_aircraft_ids_json` est ajoutée de façon additive ; les anciennes bases sans cette colonne restent importables et leurs exemplaires n’ont initialement aucune compatibilité enregistrée. Les anciens outils suivis par quantité sont convertis à l’ouverture en exemplaires individuels : le nombre d’outils est conservé et l’unité d’origine est reportée dans les notes de chaque exemplaire généré. Les anciennes références de fournitures sans exemplaire physique sont également normalisées en suivi quantitatif ; les références possédant encore des exemplaires ne sont pas transformées automatiquement afin de ne perdre aucune identité individuelle.

## Sauvegarde, import et remise à zéro

Le repository SQLite expose une sauvegarde vers un fichier de destination et une opération de remise à zéro transactionnelle des tables métier. La couche desktop :
- crée et gère le registre local des inventaires ;
- copie les fichiers importés avant de les ouvrir ;
- exporte une copie complète de la base active ;
- génère un CSV à partir du snapshot métier ;
- crée une sauvegarde avant de réinitialiser la base active.

Le registre `inventories.json` n’est pas stocké dans les fichiers SQLite exportés. Une sauvegarde SQLite représente donc un inventaire métier, pas une sauvegarde complète du registre multi-inventaires de l’installation.

La suppression d’un inventaire secondaire est gérée dans le processus principal Electron : l’inventaire principal (première entrée du registre) et l’inventaire actif sont protégés. Le fichier et ses éventuels fichiers WAL/SHM sont déplacés temporairement avant la mise à jour du registre, puis supprimés. Le renderer ne manipule jamais directement les chemins.

La maintenance SQLite expose un compactage de la base active. Le repository effectue d’abord un checkpoint/truncate du WAL, puis `VACUUM` ; l’interface compare la taille du fichier avant et après l’opération.

La table `stock_movements` ne contient actuellement aucun attribut d’archivage ou de corbeille. La mise à l’écart restaurable des mouvements ne peut donc pas être implémentée sans évolution additive du schéma et du modèle métier. Aucune suppression des mouvements n’est ajoutée dans ce lot.

## Limites et points à valider

- Les inventaires sont indépendants au niveau des fichiers SQLite ; il n’existe ni synchronisation ni partage réseau.
- L’import doit être vérifié avec les versions de schéma réellement supportées ; un fichier SQLite quelconque n’est pas nécessairement une base RC Workshop compatible.
- La procédure de restauration d’une sauvegarde exportée n’est pas encore décrite comme un parcours utilisateur dédié.
- Le CSV est un export de données courantes ; il ne remplace pas une sauvegarde SQLite et ne constitue pas un export complet du registre.
- Les chemins des photos et leur comportement lors d’un export/import doivent être validés et documentés.
