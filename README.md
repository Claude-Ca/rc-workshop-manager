# RC Workshop Manager

Application Windows de gestion d'inventaire et de flotte pour l'aéromodélisme RC.

> État initial du dépôt : cadrage et mise en place du socle projet en cours. Les fonctionnalités décrites dans la documentation sont des objectifs ; consulter le code et le plan de développement pour connaître l'état réellement livré.

## Objectifs

- Catalogue visuel des composants et consommables.
- Fiches détaillées avec caractéristiques et photos facultatives.
- Gestion en quantité pour les consommables et suivi individuel pour les équipements identifiables.
- Affectation aux avions et projets, avec états disponible, installé ou réservé.
- Localisation physique facultative (armoire, tiroir, boîte, étagère).
- Historique des mouvements et des affectations.
- Identification individuelle des récepteurs, avec identifiant cohérent avec le nom utilisé sur la radio (ex. `RX-007`).

## Documentation

La documentation de référence est organisée dans [`docs/`](docs/README.md) : gouvernance, besoins fonctionnels, architecture technique, plans et guides.

## Technologies envisagées

- TypeScript et React pour l'interface.
- Electron pour l'application Windows.
- SQLite pour la persistance locale.
- pnpm workspaces pour le monorepo.
- Vitest pour les tests.

## Licence et droits

Tous droits réservés. La mise à disposition publique du dépôt ne vaut pas autorisation de réutilisation, de redistribution ou d'exploitation du code sans accord écrit préalable du titulaire des droits.
