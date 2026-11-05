# Registre des décisions

**Identifiant :** GOV-RCWM-002  
**Version du document :** 1.2  
**Dernière mise à jour :** 2026-11-05  
**Statut :** En revue  
**Périmètre :** décisions structurantes de cadrage et d'implémentation

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
| DEC-016 | Cycle de vie des inventaires | Suppression autorisée uniquement pour un inventaire secondaire fermé ; le premier inventaire du registre est le principal et ne peut pas être supprimé |
| DEC-017 | Maintenance SQLite | Compactage manuel de la base active depuis Administration, avec checkpoint WAL puis `VACUUM` |
| DEC-018 | Corbeille des mouvements | Mise à la corbeille, restauration sans effet sur le stock et vidange définitive reportées à une évolution additive du modèle SQLite ; aucune suppression de mouvement dans le lot courant |
| DEC-019 | Type d'aéronef | Type distinct de la propulsion ; valeurs V1 : Avion, Planeur, Motoplaneur, Hélicoptère, Multirotor et Autre. « Jet » relève de la propulsion, pas du type |
| DEC-020 | États de l'aéronef | Type, état opérationnel et cycle de vie sont trois dimensions indépendantes |
| DEC-021 | Favoris de flotte | Maximum de quatre aéronefs favoris par inventaire, affichés sur la vue d'ensemble |
| DEC-022 | Journal de bord | Journal facultatif, chronologique et indépendant des mouvements de stock ; un événement ne modifie pas automatiquement l'état opérationnel |
| DEC-023 | Récupération d'équipements | Récupération sélective des équipements affectés ; les batteries restent hors affectation et sont exclues de ce parcours |
| DEC-024 | Vente et retrait | Chaque équipement affecté reçoit une destination explicite ; clôture atomique, historisée et définitive en V1, sans suppression des identités physiques |

## Historique

- DEC-011 précise le mode de suivi des fournitures et de l’outillage.
- DEC-012 à DEC-015 enregistrent les décisions livrées dans le lot multi-inventaires et administration (PR #10).
- DEC-019 à DEC-024 formalisent les décisions fonctionnelles validées pour les évolutions de la flotte et du cycle de vie des aéronefs.
- Le lot B implémente les dimensions de classification et les favoris définis par DEC-019 à DEC-021 ; les autres décisions restent à réaliser dans les lots suivants.
- L’architecture réseau, la synchronisation, les comptes et la collaboration multi-utilisateur restent hors périmètre actuel.
- Les documents fonctionnels et le plan de développement sont la référence pour distinguer fonctionnalités intégrées et recette propriétaire encore à effectuer.
