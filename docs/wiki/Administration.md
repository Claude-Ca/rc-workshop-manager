# Administration

## Bases d'inventaire

La gestion des bases permet de reprendre la dernière base utilisée, ouvrir une base, créer une base vide, importer un fichier SQLite ou supprimer une base locale non principale qui n'est pas active. La suppression d'une base est définitive et l'application affiche une confirmation. Vérifiez la base active avant de modifier le stock.

Chaque base constitue un inventaire indépendant. Les favoris sont également propres à chaque base.

## Outils d'administration

- Exporter la base SQLite crée une copie complète de la base active à l'emplacement choisi.
- Exporter en CSV exporte les données courantes pour les catégories sélectionnées.
- Compacter la base lance une optimisation SQLite et indique l'espace récupéré.
- Réinitialiser l'inventaire vide la base active après saisie du mot de confirmation REINITIALISER. Une sauvegarde automatique est créée avant la remise à zéro.

Ces commandes s'appliquent à la base active; vérifiez son nom avant de les utiliser.
