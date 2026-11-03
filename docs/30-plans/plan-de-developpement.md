# Plan de développement

**Version de travail :** 0.2.0  
**Branche de référence :** `develop`  
**Dernière mise à jour :** 2026-11-03

## État de référence

Les PR #9 et #10 sont fusionnées dans `develop`. Elles livrent respectivement le catalogue enrichi (motorisation, radio, exemplaires, stocks quantitatifs, flotte/projets) et la gestion multi-inventaires locaux avec exports et administration.

La CI associée aux dernières PR est annoncée verte pour les tests, le typecheck et le build. La validation fonctionnelle sur le poste Windows du propriétaire reste distincte et n’est pas considérée comme acquise.

## Lots et avancement

| Lot | Contenu | État | Preuve / reste à faire |
|---|---|---|---|
| 1. Fondation | Monorepo pnpm, TypeScript, Electron/React, CI, gouvernance | Réalisé | PR #1 et workflow CI |
| 2. Domaine métier | Références, exemplaires, lots, affectations, mouvements, règles métier | Intégré | PR #9 ; parcours à valider sur Windows |
| 3. Catalogue et flotte | Catégories, moteurs/hélices, radio TX/RX, avions, projets, aperçu | Intégré | PR #9 ; validation propriétaire en attente |
| 4. Persistance locale | SQLite, migrations additives, repository et IPC desktop | Intégré | PR #9 ; tests de non-régression sur anciennes bases à confirmer |
| 5. Inventaires multiples | Registre local, création, ouverture, import par copie, reprise du dernier inventaire | Intégré | PR #10 ; isolation et import à valider sur Windows |
| 6. Export et administration | Copie SQLite, CSV par catégories, reset avec sauvegarde préalable | Intégré | PR #10 ; vérifier restauration, CSV et portée du reset |
| 7. Validation fonctionnelle Windows | Parcours bout en bout, persistance, sauvegarde/restauration, données existantes | À faire | Campagne de recette propriétaire |
| 8. Stabilisation et release | Corrections issues de recette, packaging/installateur, procédure de mise à jour et sauvegarde | À cadrer | Pas de release déclarée à ce stade |

## Campagne de recette prioritaire

À réaliser dans un ordre limitant les risques pour les données :

1. **Préparation sûre** : sauvegarder le répertoire de données existant ; utiliser d’abord des bases de test, pas l’inventaire réel.
2. **Inventaires** : créer deux bases, saisir des données distinctes, basculer entre elles, fermer/redémarrer et vérifier la reprise du dernier inventaire.
3. **Import** : importer une copie d’une base de test ; vérifier que le fichier source n’est pas modifié et que les données importées sont cohérentes.
4. **Catalogue et stock** : références, archivage/restauration, exemplaires, fournitures/outils et ajustements de quantités.
5. **Radio et flotte** : émetteurs/récepteurs, bind, affectations, aperçu avion, projets et mouvements.
6. **Exports** : ouvrir la sauvegarde SQLite exportée dans une copie de test ; vérifier le CSV dans un tableur et ses filtres.
7. **Réinitialisation** : uniquement sur une base jetable ; vérifier la création de la sauvegarde avant remise à zéro et l’intégrité des autres inventaires.
8. **Résilience** : redémarrage, migrations depuis l’ancienne base, erreurs d’import et chemins/photos.

## Points ouverts / risques identifiés

- Définir et tester les versions de schéma SQLite acceptées à l’import.
- Documenter une procédure simple de restauration d’une sauvegarde SQLite et décider si le registre multi-inventaires doit aussi être sauvegardé.
- Vérifier le comportement des photos lors d’une sauvegarde, d’un import et d’un déplacement de base.
- Vérifier que le reset ne peut être déclenché qu’après confirmation UI et qu’une sauvegarde exploitable existe.
- Contrôler la robustesse du registre local en cas de fichier JSON absent, invalide ou partiellement écrit.
- Définir le périmètre exact du packaging Windows, de l’installation et des mises à jour avant une première release.

## Lot ultérieur — uniquement après recette

Les fonctions réseau (serveur hébergé, comptes, rôles, collaboration et synchronisation) restent hors périmètre. Elles nécessiteront un cadrage fonctionnel et une décision d’architecture dédiés ; l’API IPC actuelle ne doit pas être présentée comme une API réseau.
