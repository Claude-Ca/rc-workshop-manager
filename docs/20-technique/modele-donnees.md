# Modèle de données — état de l’implémentation

**Statut :** décrit le code intégré dans `develop` au 2026-11-03  
**Références :** PR #9 et PR #10

## Séparation des données

Une installation peut gérer plusieurs inventaires locaux indépendants. Chaque inventaire métier est un fichier SQLite distinct. Le registre des inventaires est conservé séparément dans `inventories.json`, sous le répertoire utilisateur de l’application. Il contient notamment l’identifiant applicatif, le nom, le chemin géré par l’application, la date de création, la dernière utilisation, l’identifiant actif et l’identifiant du dernier inventaire utilisé.

Les chemins et opérations de fichiers restent dans le processus principal Electron. À l’import, le fichier sélectionné est copié dans le répertoire applicatif avant ouverture. La copie est contrôlée en lecture seule (intégrité SQLite, tables métier attendues et colonnes de base) avant que le repository ne l’ouvre en écriture et applique ses migrations additives. Une copie incompatible est supprimée et n’est pas inscrite au registre ; le fichier source reste intact. Le renderer passe par l’API desktop typée et IPC ; il ne doit pas accéder directement à SQLite ou au système de fichiers.

## Entités métier SQLite

- `ComponentReference` / table `component_references` : référence catalogue, catégorie, marque/modèle/description, mode de suivi, propriétés radio et motorisation typées, attributs, chemin de photo, archivage et date de création.
- `StockItem` / table `stock_items` : exemplaire physique, code inventaire unique, numéro de série, état, emplacement, avion/projet éventuel, nom TX16 et identifiant de l’émetteur lié.
- `StockLot` / table `stock_lots` : quantité entière non négative, unité et emplacement, rattachés à une référence.
- `Aircraft` / table `aircraft` : nom, constructeur, modèle, notes et immatriculation UAF facultatifs.
- `Project` / table `projects` : nom, statut et notes.
- `StockMovement` / table `stock_movements` : événement daté lié à une référence et, selon le cas, à un exemplaire, un lot, un avion ou un projet.

Le snapshot d’un inventaire regroupe références, exemplaires, lots, avions, projets et mouvements.

## Catégories et compatibilité

Les catégories principales exposées par le catalogue sont `motor`, `esc`, `radio`, `servo`, `battery`, `supplies`, `tool` et `other`. Le type accepte encore plusieurs valeurs historiques pour compatibilité. À l’initialisation SQLite, les anciennes catégories `receiver` sont converties en `radio` avec `radio_type='receiver'`, et `connector`, `control`, `structure`, `material`, `construction` sont regroupées sous `supplies`.

## Règles métier structurantes

- Une référence catalogue n’est pas un exemplaire physique.
- Les exemplaires ont un code inventaire unique ; les noms TX16 des récepteurs sont uniques sans distinction de casse.
- Un récepteur peut être lié à un émetteur ; les émetteurs ne sont pas affectés directement aux avions dans ce périmètre.
- Un exemplaire peut être installé sur un avion ou réservé à un projet ; une seule affectation active est permise par les règles du service métier.
- Fournitures et outils sont suivis par quantités ; les quantités de lot sont entières et non négatives.
- Les mouvements sont append-only dans le flux métier courant ; les suppressions/ajustements ne doivent pas effacer les événements antérieurs.
- Une référence dépendante est archivée pour préserver l’historique.
- Les migrations de schéma sont additives et doivent préserver les bases existantes.

## Sauvegarde, import et remise à zéro

Le repository SQLite expose une sauvegarde vers un fichier de destination et une opération de remise à zéro transactionnelle des tables métier. La couche desktop :
- crée et gère le registre local des inventaires ;
- copie les fichiers importés avant de les ouvrir ;
- exporte une copie complète de la base active ;
- génère un CSV à partir du snapshot métier ;
- crée une sauvegarde avant de réinitialiser la base active.

Le registre `inventories.json` n’est pas stocké dans les fichiers SQLite exportés. Une sauvegarde SQLite représente donc un inventaire métier, pas une sauvegarde complète du registre multi-inventaires de l’installation.

## Limites et points à valider

- Les inventaires sont indépendants au niveau des fichiers SQLite ; il n’existe ni synchronisation ni partage réseau.
- L’import doit être vérifié avec les versions de schéma réellement supportées ; un fichier SQLite quelconque n’est pas nécessairement une base RC Workshop compatible.
- La procédure de restauration d’une sauvegarde exportée n’est pas encore décrite comme un parcours utilisateur dédié.
- Le CSV est un export de données courantes ; il ne remplace pas une sauvegarde SQLite et ne constitue pas un export complet du registre.
- Les chemins des photos et leur comportement lors d’un export/import doivent être validés et documentés.
