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
