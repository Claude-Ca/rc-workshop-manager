# Registre des décisions

**Statut :** décisions de cadrage et d’implémentation  
**Dernière mise à jour :** 2026-11-03

| ID | Sujet | Décision |
|---|---|---|
| DEC-001 | Application | React + TypeScript + Electron |
| DEC-002 | Persistance | SQLite local, un fichier par inventaire |
| DEC-003 | Monorepo | pnpm workspaces |
| DEC-004 | Modèle de stock | Références catalogue distinctes des exemplaires physiques |
| DEC-005 | Consommables | Gestion quantitative lorsque le suivi individuel n’apporte rien |
| DEC-006 | Équipements traçables | Identifiant individuel, état, historique et affectation |
| DEC-007 | Récepteurs | Identifiant inventaire cohérent avec le nom radio TX16 ; lien facultatif vers un émetteur |
| DEC-008 | Localisation | Facultative et progressive |
| DEC-009 | Photos | Facultatives ; métadonnées et chemin applicatif, comportement export/import à valider |
| DEC-010 | Périmètre fonctionnel | Catalogue, stocks, radios, avions/projets, affectations et mouvements |
| DEC-011 | Fournitures et outillage | Fournitures et outils/équipements suivis par quantités, sans exemplaires individuels ni affectation obligatoire |
| DEC-012 | Inventaires multiples | Plusieurs fichiers SQLite locaux indépendants, gérés par un registre applicatif ; création, ouverture, import par copie et reprise du dernier utilisé intégrés par PR #10 |
| DEC-013 | Export | Copie SQLite complète et export CSV de tout ou partie des catégories intégrés par PR #10 |
| DEC-014 | Administration | Réinitialisation de l’inventaire actif après confirmation UI et sauvegarde préalable intégrées par PR #10 |
| DEC-015 | Frontière desktop | Renderer via API typée/preload/IPC ; accès aux chemins et fichiers réservé au processus principal |

## Historique

- DEC-011 précise le mode de suivi des fournitures et de l’outillage.
- DEC-012 à DEC-015 enregistrent les décisions livrées dans le lot multi-inventaires et administration (PR #10).
- L’architecture réseau, la synchronisation, les comptes et la collaboration multi-utilisateur restent hors périmètre actuel.
- Les documents fonctionnels et le plan de développement sont la référence pour distinguer fonctionnalités intégrées et recette propriétaire encore à effectuer.
