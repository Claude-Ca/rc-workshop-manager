# Guide développeur

**Identifiant :** MAN-RCWM-001  
**Version du document :** 1.0  
**Dernière mise à jour :** 2026-11-04  
**Statut :** En revue  
**Environnement de référence :** Windows 10/11, Node.js 22 et pnpm 12.15.0  
**Périmètre :** installation de l'environnement et commandes de développement

## Prérequis

- Windows 10/11 64 bits.
- **Node.js 22** (npm est installé automatiquement avec Node.js).
- **pnpm 12.15.0** (gestionnaire de paquets du monorepo).
- Git.
- Un éditeur de code, par exemple Visual Studio Code.

## Installation de l’environnement Windows

### 1. Installer Node.js et npm

1. Télécharger l’installateur Windows `.msi` de la version 22 depuis le site officiel : https://nodejs.org/en/download
2. Exécuter l’installateur en conservant les options par défaut.
3. Vérifier que l’option d’ajout au `PATH` est activée.
4. Fermer puis rouvrir le terminal (PowerShell ou terminal VS Code).

Vérifier l’installation :

```powershell
node --version
npm --version
```

La première commande doit afficher une version `v22.x.x`. npm doit également afficher un numéro de version. Sa version exacte peut varier selon la distribution Node.js installée.

### 2. Activer pnpm avec Corepack

Le dépôt utilise pnpm et non npm pour installer les dépendances. Corepack est fourni avec certaines distributions de Node.js ; s’il est disponible, l’activer puis préparer la version attendue par le projet :

```powershell
corepack enable
corepack prepare pnpm@12.15.0 --activate
```

Vérifier :

```powershell
pnpm --version
```

La version attendue est `12.15.0`.

> Si la commande `corepack` n’est pas reconnue, vérifier d’abord la version de Node.js et l’installation. Ne pas remplacer pnpm par npm pour installer les dépendances du monorepo.

### 3. Récupérer le projet et installer les dépendances

Cloner le dépôt si ce n’est pas déjà fait, puis se placer à la racine du dépôt (le dossier qui contient le fichier `package.json`) :

```powershell
git clone https://github.com/Claude-Ca/rc-workshop-manager.git
cd rc-workshop-manager
pnpm install
```

Si le dépôt est déjà présent localement, se placer simplement dans son dossier puis lancer `pnpm install`.

## Installation du projet

Depuis la racine du dépôt :

```powershell
pnpm install
```

Cette commande installe les dépendances de l’ensemble du monorepo. Elle est à relancer après une modification des dépendances ou la récupération de changements qui les modifient.

## Développement

Lancer l’application desktop en mode développement :

```powershell
pnpm --filter @rc-workshop/desktop dev
```

## Vérifications

Depuis la racine du dépôt :

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Exécuter ces vérifications avant de proposer une contribution ou une pull request. Si une commande échoue, conserver le message d’erreur complet pour faciliter le diagnostic.

## Données locales

La base SQLite est créée dans le répertoire utilisateur Electron (`app.getPath("userData")`). Le nom du fichier est `rc-workshop.sqlite`. Avec la gestion multi-inventaires, les fichiers SQLite des inventaires et le registre local sont gérés dans le répertoire de données de l’application.

Les données de test ne doivent pas être confondues avec les données réelles de l'atelier. Avant toute manipulation risquée ou mise à jour importante, conserver une sauvegarde des données locales.

Le packaging Windows est prévu via electron-builder. La compilation et l'installation sur le poste cible restent à valider avant toute release.

## Gestion du catalogue et de la flotte

- La modification d’une référence conserve son identifiant catalogue : les exemplaires et lots associés continuent de pointer vers cette référence et affichent sa désignation courante.
- La suppression d’une référence inutilisée demande une confirmation. Si des exemplaires, lots ou mouvements existent, l’application demande confirmation d’archivage afin de préserver l’historique. Les références archivées peuvent être consultées avec le filtre « Afficher les références archivées » et ne peuvent pas recevoir de nouveaux exemplaires.
- La fiche avion est modifiable sans changer son identifiant ni les affectations de composants. L’immatriculation UAF est facultative.
- Les migrations SQLite sont appliquées à l’ouverture en préservant les données existantes. Il reste recommandé de conserver une sauvegarde avant une mise à jour importante.

## Gestion de configuration et contribution

Le processus détaillé de gestion de configuration (branches, commits, Pull Requests, contrôles et versions) est défini dans le [PGC](../30-plans/plan-gestion-configuration.md).

- Travailler sur une branche dédiée à une évolution ou une correction ; éviter les développements directement sur `main` ou `develop`.
- Synchroniser la branche de travail avec `develop` avant de commencer et avant de soumettre une pull request.
- Décrire dans la pull request l’objectif, les changements, les tests exécutés et les éventuels points restant à valider manuellement.
- Ne jamais committer de données personnelles d’atelier, de bases SQLite réelles, de secrets, de jetons ou de fichiers locaux de configuration.
