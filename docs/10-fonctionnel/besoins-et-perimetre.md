# Besoins et périmètre fonctionnel

**Identifiant :** FON-RCWM-001  
**Version du document :** 1.0  
**Dernière mise à jour :** 2026-11-04  
**Statut :** En revue  
**Environnement de référence :** application desktop Windows, fonctionnement local et hors ligne  
**Périmètre :** positionnement produit et besoins fonctionnels de la V1 aéromodélisme

## 1. Positionnement et objectif

RC Workshop Manager est un gestionnaire d'atelier destiné en premier lieu aux **aéromodélistes**. La V1 est spécialisée dans l'aéromodélisme : elle ne cherche pas à couvrir génériquement les voitures ou les bateaux radiocommandés.

L'objectif est de permettre à un aéromodéliste de gérer simplement son atelier personnel, son parc de modèles et le matériel associé. L'utilisateur doit pouvoir distinguer les équipements installés sur un modèle, les équipements disponibles en stock, les matériels compatibles avec plusieurs modèles, les fournitures et l'outillage.

Le produit doit constituer une version gratuite réellement utile et autonome. Une éventuelle offre payante pourra apporter ultérieurement des fonctions avancées, mais la V1 gratuite ne doit pas être artificiellement bridée.

## 2. Utilisateurs et mode d'utilisation

### Cible principale

L'aéromodéliste individuel qui gère son atelier et son parc de modèles.

### Cible secondaire possible

Un responsable ou gestionnaire de club peut utiliser un inventaire collectif distinct. Cet usage reste local et individuel : un inventaire est utilisé par une personne à la fois. La V1 ne prévoit ni collaboration simultanée, ni comptes, ni synchronisation réseau.

### Périmètre des inventaires

Un inventaire constitue un périmètre de données autonome. Il peut représenter, par exemple, l'atelier personnel d'un utilisateur ou le matériel d'un club. Les données personnelles et celles du club restent séparées : le matériel du club est enregistré dans l'inventaire du club et n'est pas mélangé avec l'inventaire personnel.

L'application est desktop Windows, locale et utilisable hors ligne. Les données sont persistées dans des fichiers SQLite locaux. Un registre applicatif conserve les inventaires connus et leurs métadonnées ; l'application reprend au démarrage le dernier inventaire utilisé.

## 3. Concepts métier

- **Référence catalogue** : description d'un type de matériel (marque, modèle, caractéristiques).
- **Exemplaire individuel** : objet physique identifié et suivi séparément.
- **Stock simple** : présence ou absence d'une fourniture/consommable, sans suivi individuel des unités.
- **Modèle** : avion, planeur ou autre aéronef relevant de l'aéromodélisme.
- **Affectation** : relation indiquant qu'un équipement est installé sur un modèle.
- **Compatibilité** : relation indiquant qu'un équipement peut être utilisé avec un ou plusieurs modèles, sans être installé ni réservé à ceux-ci.
- **Mouvement / événement** : trace sélective d'un événement significatif dans la vie d'un équipement ou du stock.

L'état actuel du matériel (stock, affectation, disponibilité) est la donnée de référence. L'historique est une information complémentaire : sa suppression ne doit jamais modifier l'état courant.

## 4. Périmètre fonctionnel V1

### 4.1 Gestion des inventaires locaux

L'utilisateur peut :
- lister les inventaires enregistrés et identifier l'inventaire actif et le dernier utilisé ;
- créer un inventaire SQLite vide ;
- ouvrir un inventaire existant enregistré ;
- importer un fichier SQLite en le copiant dans le répertoire applicatif ; le fichier source n'est jamais ouvert directement ni modifié ;
- contrôler en lecture seule l'intégrité SQLite et la structure métier de la copie avant toute ouverture avec migrations ;
- reprendre rapidement le dernier inventaire utilisé et le rouvrir automatiquement au démarrage ;
- afficher le nom de l'inventaire actif dans l'interface.

Les données de chaque inventaire sont isolées : références, exemplaires, stocks, avions, projets et mouvements. La suppression d'un inventaire secondaire fermé est possible depuis Administration ; l'inventaire principal et l'inventaire actuellement ouvert sont protégés.

### 4.2 Catalogue et références

Le catalogue distingue les références des exemplaires physiques et des stocks simples.

Les catégories métier principales couvrent notamment :
- aéronefs ;
- motorisation ;
- radio ;
- servos ;
- batteries ;
- hélices ;
- fournitures et consommables ;
- outillage et équipements d'atelier.

Les références peuvent comporter marque, modèle, description, photo et attributs techniques pertinents. Les références utilisées par des exemplaires ou l'historique sont archivées plutôt que supprimées afin de préserver les liens.

### 4.3 Équipements suivis individuellement

Les équipements physiques dont l'identité et l'affectation ont une valeur sont suivis individuellement. Cela concerne notamment les moteurs, récepteurs, ESC, servos, batteries et hélices.

Une fiche d'exemplaire peut contenir un code inventaire, un numéro de série facultatif, un état, un emplacement et des notes.

**Affectation à un modèle :**
- Un moteur, un récepteur, un ESC, un servo ou une hélice peut être en stock ou affecté à un modèle lorsqu'il est installé.
- Le retrait d'un équipement met fin à son affectation et le rend à nouveau disponible en stock, selon son état.
- Un exemplaire ne peut avoir qu'une seule affectation active à la fois.

**Batteries et compatibilité :**
- Une batterie est suivie individuellement.
- Elle peut être compatible avec plusieurs modèles sans être affectée définitivement à l'un d'eux.
- La compatibilité ne constitue ni une réservation ni une affectation.
- Les batteries appartenant à un club sont enregistrées dans l'inventaire du club ; il n'est pas nécessaire de créer des lots d'usage dans un même inventaire.

**Radio :**
- Les récepteurs peuvent porter un nom TX16 unique et être liés à un émetteur.
- Un récepteur peut être affecté à un avion ; l'émetteur lié est présenté dans le contexte de l'équipement.
- Les émetteurs ne sont pas affectés directement aux avions dans le périmètre V1.

### 4.4 Fournitures et consommables

Les fournitures et consommables font l'objet d'une gestion volontairement simple :
- une référence de fourniture ;
- un état de stock binaire : en stock ou rupture ;
- pas d'identification individuelle des unités ;
- pas d'affectation à un modèle ;
- pas de gestion détaillée des lots ou de la consommation.

Exemples : visserie, charnières, gaines, câbles, connecteurs, colles et petits consommables.

Les hélices ne sont pas des consommables dans ce modèle : elles sont suivies comme des équipements individuels, en stock ou affectés à un modèle, au même titre qu'un moteur.

### 4.5 Outillage et équipements d'atelier

L'outillage est suivi individuellement, avec une gestion légère. Chaque outil peut avoir une désignation, une marque/modèle, un emplacement, des notes et un statut de disponibilité.

Les statuts retenus sont :
- **Disponible** : présent dans l'atelier et utilisable ;
- **Prêté** : temporairement indisponible dans l'atelier ;
- **En réparation** : indisponible pour maintenance.

La gestion détaillée des emprunteurs, échéances de retour et interventions de réparation n'est pas requise en V1.

### 4.6 Avions et projets

Une fiche modèle comporte au minimum un nom et peut contenir constructeur, modèle, notes et immatriculation UAF facultative. La flotte permet de consulter les équipements affectés et une prévisualisation en lecture seule.

Les projets peuvent avoir les statuts planned, active, completed ou cancelled. Les règles d'affectation et de réservation doivent empêcher qu'un même exemplaire soit affecté simultanément à plusieurs destinations incompatibles.

### 4.7 Historique sélectif des événements

L'application conserve automatiquement les événements significatifs, sans journaliser toutes les modifications de l'utilisateur.

Événements pertinents :
- entrée ou acquisition d'un exemplaire dans l'inventaire ;
- affectation à un modèle et désaffectation ;
- changement significatif de disponibilité ou d'état (par exemple passage en réparation ou retour en service) ;
- archivage ou mise au rebut ;
- retour de réparation lorsqu'il modifie la disponibilité.

Événements non requis :
- consultation d'une fiche ;
- modification d'une note ou d'une description ;
- simple changement d'emplacement ;
- opérations internes sans valeur métier pour l'utilisateur.

L'historique est consultable et peut être nettoyé : suppression d'un événement isolé et purge de l'historique. Une confirmation explicite est demandée avant une purge globale ; une sauvegarde préalable peut être proposée. La purge de l'historique ne doit jamais modifier les fiches, stocks, statuts, compatibilités ou affectations courants.

L'historique V1 est une aide à la compréhension de la vie du matériel, pas une piste d'audit réglementaire ni un journal immuable.

### 4.8 Export, sauvegarde et administration

Depuis l'inventaire actif, l'utilisateur peut :
- exporter une copie SQLite complète ;
- exporter un CSV de l'inventaire complet ou de catégories sélectionnées ;
- réinitialiser l'inventaire actif après confirmation explicite et sauvegarde préalable ;
- supprimer un inventaire secondaire fermé, à l'exclusion de l'inventaire principal et de l'inventaire actif ;
- compacter manuellement la base active pour récupérer l'espace inutilisé.

La sauvegarde, la restauration et la portabilité des données constituent des fonctions fondamentales qui doivent rester disponibles dans une éventuelle version gratuite.

## 5. Principes d'offre et évolutivité commerciale

### Version gratuite

La version gratuite doit permettre à un aéromodéliste de gérer réellement son atelier personnel, sans limitation artificielle des opérations essentielles :
- parc de modèles ;
- catalogue et inventaire ;
- équipements individuels, affectations et compatibilités ;
- fournitures et consommables en stock simple ;
- outillage et disponibilité ;
- historique simple des événements significatifs ;
- sauvegarde, restauration et export des données.

Cette version doit être suffisamment complète pour permettre de tester l'intérêt du marché et de recueillir des retours d'utilisateurs.

### Évolutions payantes possibles — non engagées

Des fonctions avancées pourront être étudiées après validation de l'usage et du potentiel marché : recherche et filtres avancés dans l'historique, statistiques, rapports, suivi détaillé de maintenance/réparation ou conservation étendue.

Ces éléments sont des pistes, pas des exigences V1 ni des engagements commerciaux.

### Principes de conception

- Ne pas construire toutes les fonctions Premium à l'avance.
- Préserver une séparation technique possible entre fonctions de base et capacités avancées, sans mettre en place prématurément un système de licence complexe.
- Ne pas disperser des contrôles d'offre dans les règles métier.
- Ne jamais rendre les données utilisateur inaccessibles en raison du niveau d'offre.
- La sauvegarde, la restauration et l'export de base restent accessibles.
- Une fonction payante doit apporter une valeur supplémentaire, pas retirer artificiellement une fonction essentielle.

## 6. Hors périmètre V1

- Gestion des voitures et bateaux radiocommandés ou d'autres disciplines RC.
- Serveur hébergé, API distante opérationnelle, comptes, rôles et authentification.
- Synchronisation cloud/réseau et collaboration simultanée.
- Application mobile et intégration directe avec la radio TX16.
- Affectation automatique d'un émetteur à un avion.
- Gestion fine des consommations par longueur, lot ou historique de consommation.
- Gestion complète des prêts (emprunteur, échéance, relances).
- Gestion détaillée des interventions de réparation.
- Offre Premium commercialisée, système de paiement ou mécanisme de licence.

D'autres disciplines RC pourraient faire l'objet de projets dédiés réutilisant, lorsque cela est pertinent, des briques techniques ou métier de RC Workshop Manager. Elles ne doivent pas dicter le périmètre fonctionnel aéromodéliste de la V1.

## 7. État de réalisation et validation

La PR #12, relative à l'administration des inventaires et au compactage SQLite, a été fusionnée dans `develop` (squash commit `b4d3317`). Les contrôles automatisés de cette PR étaient verts (tests, typecheck et build). Les parcours d'administration concernés ont également fait l'objet d'une validation manuelle Windows par le propriétaire.

La présente révision formalise des décisions métier supplémentaires. Elle ne signifie pas que toutes les fonctions décrites (notamment compatibilités batterie, hélices suivies individuellement, outillage à statuts et historique sélectif avec purge) sont déjà implémentées. Leur état de réalisation doit être suivi séparément dans le plan de développement et la traçabilité des exigences.

Les migrations SQLite doivent rester additives. Aucune donnée utilisateur ne doit être supprimée silencieusement lors d'une mise à jour.
