# Guide développeur

**Statut :** première version — à compléter après validation sur Windows

## Prérequis

- Windows 10/11 64 bits.
- Node.js 22.
- pnpm 12.15.0.
- Git.

## Installation

```powershell
pnpm install
```

## Développement

```powershell
pnpm --filter @rc-workshop/desktop dev
```

## Vérifications

```powershell
pnpm test
pnpm typecheck
pnpm build
```

## Données locales

La base SQLite est créée dans le répertoire utilisateur Electron (`app.getPath("userData")`). Le nom du fichier est `rc-workshop.sqlite`. Les données de test ne doivent pas être confondues avec les données réelles de l'atelier.

Le packaging Windows est prévu via electron-builder. La compilation et l'installation sur le poste cible restent à valider avant toute release.

## Gestion du catalogue et de la flotte

- La modification d’une référence conserve son identifiant catalogue : les exemplaires et lots associés continuent de pointer vers cette référence et affichent sa désignation courante.
- La suppression d’une référence inutilisée demande une confirmation. Si des exemplaires, lots ou mouvements existent, l’application demande confirmation d’archivage afin de préserver l’historique. Les références archivées peuvent être consultées avec le filtre « Afficher les références archivées » et ne peuvent pas recevoir de nouveaux exemplaires.
- La fiche avion est modifiable sans changer son identifiant ni les affectations de composants. L’immatriculation UAF est facultative.
- La base SQLite est mise à niveau automatiquement à l’ouverture en ajoutant les colonnes manquantes ; les données existantes ne sont pas réinitialisées. Il reste recommandé de conserver une sauvegarde de la base avant une mise à jour importante.
