# Sauvegarde et restauration

## Créer une sauvegarde

Depuis Administration, utilisez l'export de base SQLite et choisissez un emplacement que vous pourrez retrouver. Conservez une copie sur un autre support ou emplacement de sauvegarde, puis vérifiez que le fichier apparaît à l'emplacement retenu. L'export représente la base active.

La remise à zéro crée également une copie préalable dans les données locales de l'application. Cette copie automatique protège contre une erreur de remise à zéro, mais ne remplace pas une sauvegarde conservée à part.

## Importer une sauvegarde

Dans la gestion des bases, utilisez Ouvrir / importer un fichier SQLite… et sélectionnez une base RC Workshop compatible. L'application copie le fichier sélectionné dans son espace local avant de l'ouvrir et vérifie sa compatibilité. Le fichier source n'est pas modifié. Un fichier incompatible ou endommagé est refusé.

L'import ajoute une base locale; ce n'est pas une fusion avec la base actuellement ouverte. Après import, vérifiez le nom de la base et son contenu.

## Limites et précautions

- Un CSV n'est pas une sauvegarde restaurable de l'ensemble du système.
- Une sauvegarde SQLite contient un inventaire métier; elle ne contient pas le registre multi-bases de l'installation.
- Les images choisies dans l'application sont copiées dans les données utilisateur. Leur présence dans un export/import de base n'est pas garantie dans la documentation actuelle : vérifiez vos photos après migration.
- Conservez une copie source indépendante avant toute opération importante.
