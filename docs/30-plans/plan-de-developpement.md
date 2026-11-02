# Plan de développement

**Version de travail :** 0.1.0  
**Statut :** périmètre de la branche en validation finale

## Lots du périmètre actuel

| Lot | Contenu | État |
|---|---|---|
| 1. Fondation | Gouvernance, documentation, monorepo, CI et conventions | Terminé |
| 2. Backend métier | Références, exemplaires, quantités, affectations, mouvements et tests | Terminé |
| 3. Interface | Navigation, recherche/filtres, catalogue, formulaires et vues de stock simplifiées | Terminé |
| 4. Persistance desktop | SQLite locale, migrations additives et IPC sécurisé | Terminé |
| 5. Flotte et projets | Fiches avions, équipement, RX/TX, réservations et aperçu avion | Terminé |
| 6. Validation Windows | Démarrage, parcours fonctionnels, persistance et validation propriétaire | En cours |

## Validation automatisée

Sur le commit `9ad4b53a38fd4d8ca82e7b2c9ae5e37afae52a94), la CI GitHub a réussi les tests, le typecheck et le build. La suite de tests est lancée par `pnpm test`; le typecheck et le build passent également dans le workflow.

## Critère de sortie du périmètre

Le périmètre est prêt à être déclaré terminé lorsque le propriétaire a vérifié sous Windows les parcours de création/modification/suppression, les filtres, les quantités de fournitures et outils, les affectations radio/avions et la persistance après redémarrage.

## Lot ultérieur

La gestion multi-base, évoquée pour la suite, est différée. Elle fera l’objet d’un cadrage et d’un lot séparés après stabilisation de ce périmètre.
