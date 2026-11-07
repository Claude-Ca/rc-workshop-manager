# Gérer l'inventaire

## Références et exemplaires

Une référence décrit un modèle de composant (nom, marque, modèle, catégorie et caractéristiques). Un exemplaire représente une pièce physique identifiable, avec son code inventaire, son numéro de série éventuel, son état, son emplacement et son affectation. Une référence peut avoir plusieurs exemplaires.

Les références apparaissent en vignettes ou en liste. La recherche porte sur le nom, la marque, le modèle et la catégorie. Le filtre de catégorie, l'inclusion des références archivées et la recherche se combinent. Réinitialiser les filtres efface ces critères; le mode d'affichage choisi est conservé.

## Ajouter et modifier

Dans la vue Inventaire, choisissez la famille puis complétez la fiche. Les formulaires présentent des propriétés selon la famille : par exemple informations radio, motorisation ou caractéristiques facultatives de batterie. Une photo et une URL marchande sont distinctes. Le code d'inventaire d'un exemplaire doit identifier cette pièce sans doublon.

Les fournitures peuvent être suivies par quantité et unité plutôt que par identité physique. L'application distingue ce stock en lots des équipements suivis individuellement.

## États, affectations et historique

Les équipements individuels peuvent être disponibles, installés sur un aéronef, réservés à un projet, empruntés, en réparation, vendus, rebutés ou retirés, selon le parcours proposé. Les commandes d'affectation et de retour sont accessibles depuis les fiches et listes concernées. L'historique des mouvements garde la trace des opérations de stock.

La suppression d'une référence utilisée l'archive afin de conserver liens et historique; une référence sans dépendance peut être supprimée définitivement. Une référence archivée reste consultable en activant Afficher les références archivées et peut être restaurée. La suppression d'un exemplaire demande confirmation; son historique de mouvements est conservé.

## Export CSV

La vue d'export permet de choisir toutes les catégories ou une sélection. Le CSV est utile pour consulter et traiter les données tabulaires. Ce n'est pas une sauvegarde complète de la base SQLite.
