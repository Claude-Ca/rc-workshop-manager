# Besoins et périmètre fonctionnel

**Statut :** périmètre fonctionnel implémenté dans `develop`, validation propriétaire en attente  
**Référence de code :** PR #9 (catalogue, stocks, flotte et radios) et PR #10 (bases multiples, exports et administration)  
**Dernière revue documentaire :** 2026-11-03

## Objectif

Application desktop Windows, utilisable hors ligne, destinée à gérer un ou plusieurs inventaires locaux de matériel d’aéromodélisme. L’utilisateur doit pouvoir connaître les références et quantités disponibles, suivre individuellement les équipements importants, retrouver leur utilisation sur les avions et projets, et sauvegarder ou exporter ses données.

## Utilisateurs et usage

Le produit cible d’abord un usage individuel d’atelier. Plusieurs inventaires locaux indépendants sont possibles (par exemple atelier personnel et club), mais ils restent utilisés sur une même installation locale. Il n’existe pas à ce stade de collaboration simultanée, de compte utilisateur ni de synchronisation réseau.

Les données sont persistées dans des fichiers SQLite locaux. Un registre applicatif conserve les inventaires connus et leurs métadonnées. L’application reprend au démarrage le dernier inventaire utilisé.

## Périmètre fonctionnel actuel

### 1. Gestion des inventaires locaux

- Lister les inventaires enregistrés et identifier l’inventaire actif et le dernier utilisé.
- Créer un inventaire SQLite vide.
- Ouvrir un inventaire existant enregistré.
- Importer un fichier SQLite en le copiant dans le répertoire applicatif ; le fichier source n’est jamais ouvert directement ni modifié.
- Contrôler en lecture seule l’intégrité SQLite et la structure métier de la copie avant toute ouverture avec migrations. Un fichier non SQLite, vide ou incompatible est refusé et n’est pas ajouté au registre des inventaires.
- Reprendre rapidement le dernier inventaire utilisé et le rouvrir automatiquement au démarrage.
- Isoler les données de chaque inventaire : références, exemplaires, lots, avions, projets et mouvements.
- Afficher le nom de l’inventaire actif dans l’interface.

La suppression d’un inventaire enregistré et la gestion avancée de son cycle de vie ne sont pas documentées comme fonctionnalités disponibles.

### 2. Catalogue et catégories

Le catalogue distingue une référence (description d’un type de composant) des objets physiques et des stocks quantitatifs associés.

Les catégories de premier niveau sont : **Aircraft, Motorization, Radio, Servos, Batteries, Supplies, Tools and equipment**. La catégorie Divers est également présente dans le modèle applicatif. Des catégories historiques restent reconnues par le type pour compatibilité et sont migrées ou regroupées lors de l’ouverture SQLite.

Les références peuvent comporter marque, modèle, description, photo et attributs techniques facultatifs. Les propriétés dédiées couvrent notamment :
- Motorisation : moteur électrique ou Glow, tension ou cylindrée ; hélice avec diamètre et pas.
- Radio : type émetteur ou récepteur, nombre de voies, protocoles et version firmware pour l’émetteur.
- Les références utilisées dans le stock ou l’historique sont archivées plutôt que supprimées afin de préserver les liens.

### 3. Exemplaires individuels et radio

Les équipements traçables (moteurs, batteries, servos, ESC, récepteurs et autres composants) sont suivis individuellement avec code inventaire, numéro de série facultatif, état, emplacement, notes et affectation éventuelle.

Les récepteurs peuvent porter un nom TX16 unique et être liés à un émetteur. Un récepteur peut être affecté à un avion ; l’émetteur lié est présenté dans le contexte de l’équipement. Les émetteurs ne sont pas affectés directement aux avions dans ce périmètre.

### 4. Fournitures, consommables et outillage

Les fournitures et outils/équipements sont gérés en quantités et unités, sans suivi individuel ni affectation obligatoire à un avion ou projet. Les ajustements de quantités sont historisés. Le suivi fin des longueurs restantes ou des consommations par lot n’est pas inclus.

### 5. Avions et projets

Une fiche avion comporte nom, constructeur, modèle, notes et immatriculation UAF facultative. La flotte permet de consulter les équipements affectés et une prévisualisation en lecture seule.

Les projets ont les statuts planned, active, completed ou cancelled. Un exemplaire disponible peut être affecté à un avion ou réservé à un projet ; une seule affectation active est permise.

### 6. Historique et protection des données

Les mouvements datés conservent les événements de stock et d’affectation. L’archivage des références, la suppression des exemplaires et les ajustements de quantité doivent préserver les traces déjà enregistrées.

Les migrations de schéma SQLite sont additives. Les données utilisateur ne doivent pas être supprimées silencieusement lors d’une mise à jour.

### 7. Export et administration

Depuis l’inventaire actif, l’utilisateur peut :
- exporter une copie SQLite complète via le mécanisme de sauvegarde SQLite ;
- exporter un CSV de l’inventaire complet ou de catégories sélectionnées ;
- demander la réinitialisation de l’inventaire actif après confirmation explicite.

La réinitialisation crée d’abord une sauvegarde SQLite dans le répertoire local de sauvegarde, puis vide les données métier de l’inventaire actif. Les autres fichiers d’inventaire ne doivent pas être affectés.

## État de réalisation et validation

Les PR #9 et #10 sont fusionnées dans `develop`. Les descriptions de ces PR indiquent une CI verte pour tests, typecheck et build. Le code correspondant est présent dans la branche.

Cela ne vaut pas validation complète des parcours par le propriétaire. Restent à confirmer sur Windows, avec des données de test puis une sauvegarde des données réelles :
- création, import, ouverture, changement et reprise automatique de plusieurs inventaires ;
- absence de fuite de données entre deux bases ;
- import d’un ancien fichier et préservation du fichier source ;
- export SQLite réouvrable et export CSV exploitable ;
- sauvegarde préalable et portée exacte de la réinitialisation ;
- parcours catalogue, affectations, radios, avions/projets et persistance après redémarrage.

Les critères détaillés et le statut de validation sont suivis dans le plan de développement.

## Hors périmètre actuel

- Serveur hébergé, API distante opérationnelle, comptes, rôles et authentification.
- Synchronisation cloud ou réseau et collaboration multi-utilisateur simultanée.
- Application mobile et intégration directe avec la radio TX16.
- Affectation automatique d’un émetteur à un avion.
- Gestion fine des consommations par longueur ou par lot.
- Suppression/renommage avancé des inventaires enregistrés, sauf évolution spécifiée ultérieurement.
