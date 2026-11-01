# Règles de gestion de configuration

**Version :** 1.0  
**Statut :** référence de travail — règles reprises d'Anno 117 Planner

## Branches

- `main` : branche stable, réservée aux versions livrables et tags.
- `develop` : branche d'intégration continue et branche par défaut.
- Aucune évolution directe sur les branches permanentes.
- `feature/*` : créée depuis `develop`, PR obligatoire vers `develop`.
- `fix/*` : créée depuis `main`, PR vers `main`, puis report/merge-back vers `develop`.

## Pull requests

- Toute évolution passe par une PR.
- CI verte et conversations de revue résolues avant fusion.
- PR à jour avec sa branche cible.
- Fusion exclusivement en Squash.
- Aucune approbation obligatoire dans le workflow individuel.
- Aucun force-push sur les branches partagées ou permanentes.

## Commits

Conventional Commits : `type(scope): description`, scope facultatif. Types : `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, `style`, `revert`. Le marqueur de rupture `!` est autorisé. Les titres de PR suivent le même format.

## Versionnement

Version de développement initiale `0.1.0`, première stable visée `1.0.0`. SemVer : MAJOR rupture incompatible, MINOR fonctionnalité compatible, PATCH correctif compatible. Préversions alpha/beta/RC possibles. Un tag n'est créé qu'après validation des tests, du build, de l'installation et de l'essai fonctionnel Windows par le propriétaire. Les tags publiés sont immuables.
