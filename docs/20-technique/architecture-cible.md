# Architecture cible

**Statut :** choix de cadrage ; implémentation progressive

## Principes

- Application Windows locale et utilisable hors ligne.
- Monorepo TypeScript avec pnpm workspaces.
- React pour l'interface, Electron pour le desktop.
- SQLite pour la persistance.
- Logique métier indépendante de React, Electron et SQLite.
- Photos dans un répertoire applicatif ; métadonnées et chemins relatifs en base.
- IPC explicite et validé entre renderer et processus principal.

## Découpage cible

- `apps/desktop` : renderer React et shell Electron.
- `packages/core` : entités, règles métier, validation et calculs purs.
- `packages/application` : cas d'usage et ports/interfaces.
- `packages/infrastructure` : SQLite, stockage photo et adaptateurs.
- `packages/shared` : contrats/types partagés si nécessaires.

## Sécurité desktop

`contextIsolation: true`, `nodeIntegration: false`, sandbox activé lorsque compatible. API preload minimale et typée. Validation des entrées IPC côté main. Ne jamais accepter un chemin arbitraire du renderer pour lire/supprimer un fichier. Prévoir migrations et sauvegarde avant stable.

## Décisions ouvertes

Driver SQLite et packaging natif, outil build Electron/Vite, migrations, emplacement des données et stratégie de sauvegarde.
