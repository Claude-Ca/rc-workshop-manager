# Évolution de la flotte et cycle de vie des aéronefs

**Identifiant :** FON-RCWM-003  
**Version :** 1.3  
**Date :** 2026-11-05  
**Statut :** Validé pour réalisation  
**Périmètre :** évolutions fonctionnelles de la flotte, de l'inventaire et du cycle de vie des aéronefs V1

Ce document formalise les décisions validées par le propriétaire. Il décrit le comportement attendu ; il ne signifie pas que les fonctions sont déjà implémentées.

## 1. Principes de conception

La fiche d'un aéronef distingue trois dimensions indépendantes :

1. **Type d'aéronef** : nature de l'appareil.
2. **État opérationnel** : possibilité de l'utiliser actuellement.
3. **État du cycle de vie** : présence ou non de l'appareil dans la flotte active.

Un changement dans une dimension ne modifie pas implicitement les deux autres. Un crash ne signifie donc pas automatiquement que l'appareil est hors service ou retiré.

## 2. Type d'aéronef

Valeurs V1 :
- Avion
- Planeur
- Motoplaneur
- Hélicoptère
- Multirotor
- Autre

La propulsion est une caractéristique distincte du type : électrique, thermique, turbine/EDF, etc. « Jet » n'est pas une catégorie de type d'aéronef.

## 3. État opérationnel

Valeurs V1 :
- **En état de vol** : appareil utilisable.
- **En maintenance** : immobilisé temporairement pour intervention.
- **Pour pièces** : conservé principalement pour récupérer ses équipements.
- **Hors service** : non utilisable, sans que cela implique à lui seul une clôture du cycle de vie.

Un incident ou un crash est un événement du journal. Il ne déclenche pas automatiquement un changement d'état.
- **En maintenance** : immobilisé temporairement pour intervention.
- **Pour pièces** : conservé principalement pour récupérer ses équipements.
- **Hors service** : non utilisable, sans que cela implique à lui seul une clôture du cycle de vie.

Un incident ou un crash est un événement du journal. Il ne déclenche pas automatiquement un changement d'état.

## 4. Cycle de vie

Valeurs :
- **Actif** : appareil appartenant encore à l'inventaire.
- **Vendu** : appareil cédé.
- **Retiré** : appareil sorti définitivement de la flotte sans vente.

La vente et le retrait constituent des opérations de clôture. En V1, une clôture confirmée est définitive ; la réouverture automatique d'un appareil clôturé n'est pas prévue.

## 5. Favoris

- Chaque inventaire peut comporter au maximum quatre aéronefs favoris.
- Les favoris sont propres à l'inventaire courant.
- La vue d'ensemble présente les favoris au-dessus de la section « Explorer le stock ».
- Une carte présente au minimum la photo, le nom et l'état opérationnel.
- La limite de quatre est contrôlée dans l'interface et dans la logique métier.
- Le retrait d'un favori est toujours possible ; l'ajout d'un cinquième est refusé sans modifier les autres favoris.

## 6. Ergonomie de l'inventaire et de la flotte

### 6.1 Vue d'ensemble
- Présenter les favoris au-dessus de « Explorer le stock ».
- Ajouter un raccourci « + » à chaque famille de matériel pour ouvrir directement la création d'une référence de cette catégorie.

### 6.2 Vue Inventaire
- Déplacer l'action générale d'ajout dans la vue Inventaire, au niveau de la recherche et juste avant celle-ci.
- Réduire la largeur de la recherche pour laisser la place à l'action.
- Conserver le choix de catégorie avant l'ouverture du formulaire adapté.

### 6.3 Vue Mes avions
- Remplacer la saisie directe d'un nouvel appareil par un bouton « Nouvel avion » en haut de la vue.
- Ouvrir une modale dédiée réutilisant le formulaire de modification de fiche.
- Adapter le titre et l'action selon le mode : création ou modification.

## 7. Récupération sélective des équipements

La récupération d'équipements reste une action volontaire et indépendante du changement d'état opérationnel ou du cycle de vie. En particulier, passer un aéronef à **Hors service** ne déclenche pas automatiquement de popup et ne modifie aucune affectation.

Depuis l'aperçu de la fiche, l'utilisateur peut récupérer sélectivement les équipements affectés. Les exemplaires choisis sont désaffectés, rendus disponibles et historisés ; les autres restent affectés. Les batteries sont exclues : leur relation avec un aéronef est une compatibilité, pas une affectation.

La vente et le retrait définitif sont des opérations dédiées décrites au § 9. Elles imposent une destination pour chaque équipement encore affecté et clôturent l'aéronef de façon atomique.

## 8. Journal de bord

Le journal est une mémoire facultative de l'appareil, et non un carnet de vol réglementaire.

Types d'événements V1 :
- Mise en service / premier vol
- Vol
- Maintenance
- Incident / crash
- Vente
- Retrait définitif

Chaque événement possède un type et une date obligatoires. Le commentaire et le nombre de vols sont facultatifs. Les événements sont présentés chronologiquement et peuvent être corrigés sans créer de doublon. Les six types proposés sont : mise en service / premier vol, vol, maintenance, incident / crash, vente et retrait définitif.

Le journal est indépendant des mouvements de stock : renseigner une maintenance dans le journal ne génère pas automatiquement un mouvement d'inventaire. Un événement de crash ne change pas automatiquement l'état opérationnel. Un appareil sans événement reste pleinement utilisable.

## 9. Vente, retrait et devenir des équipements

Lorsqu'un aéronef est vendu ou retiré, l'application présente tous les équipements encore affectés. Aucun équipement ne peut être supprimé ou traité automatiquement sans décision explicite.

Pour chaque exemplaire, l'utilisateur choisit une destination :
- **Récupéré dans l'inventaire** : désaffecté et rendu disponible si son état le permet.
- **Vendu avec l'avion** : cédé avec l'appareil et retiré du stock disponible.
- **Vendu séparément** : cédé séparément et retiré du stock disponible.
- **Mis au rebut** : déclaré rebuté et retiré du stock disponible.

Les choix sont individuels. La clôture est impossible tant qu'un équipement affecté ne possède pas de destination. Un récapitulatif est présenté avant confirmation.

La clôture et le devenir de chaque équipement sont historisés. Les références catalogue et les identités physiques sont conservées ; une sortie du stock disponible ne signifie pas une suppression de l'enregistrement. L'opération complète doit être atomique : si une étape échoue, aucune partie de la clôture ne doit être appliquée.

## 9.1 Consultation et navigation de la flotte (lot F)

La page « Ma Flotte » propose un affichage en vignettes ou en liste horizontale. Les deux modes présentent le même résumé : nom, type, constructeur/modèle, état opérationnel, cycle de vie, immatriculation UAF lorsqu'elle existe, récepteur affecté lorsqu'il existe, nombre d'équipements installés et favori. L'étoile est une action indépendante de l'ouverture de la fiche.

La sélection d'une ligne ou vignette ouvre la fiche complète dans la navigation principale. Elle expose les informations de l'aéronef, sa configuration, les actions Modifier et Journal de bord, ainsi que la section Cycle de vie qui donne accès aux opérations de vente et de retrait déjà régies par le lot E.

La recherche couvre le nom, le constructeur, le modèle, l'immatriculation UAF et les notes. Les filtres peuvent combiner type, état opérationnel, cycle de vie et favoris. Les aéronefs peuvent être regroupés par état opérationnel ou cycle de vie ; chaque groupe est repliable. Les groupes « Hors service », « Vendu » et « Retiré » sont repliés par défaut. Les compteurs reflètent le résultat filtré et le nombre d'aéronefs dans chaque groupe.

Les futures icônes vectorielles des six types d'aéronefs relèvent d'un lot ultérieur : une charte visuelle réutilisable pour la ligne de produits sera définie avant leur création.

## 10. Exigences et critères d'acceptation

| ID | Exigence | Critère d'acceptation |
|---|---|---|
| REQ-AIR-001 | Distinguer type, état opérationnel et cycle de vie | Modifier l'un ne modifie pas implicitement les deux autres |
| REQ-AIR-002 | Proposer les six types V1 définis | « Jet » n'apparaît pas comme type |
| REQ-AIR-003 | Gérer quatre favoris maximum par inventaire | Toute tentative d'en ajouter un cinquième est refusée |
| REQ-AIR-004 | Accéder rapidement à la création depuis les familles | Le raccourci ouvre le formulaire de la catégorie choisie |
| REQ-AIR-005 | Créer un aéronef via une modale dédiée | Le formulaire partagé fonctionne en création et en modification |
| REQ-AIR-006 | Récupérer sélectivement les équipements affectés | Seuls les éléments sélectionnés sont désaffectés et historisés |
| REQ-AIR-007 | Maintenir la distinction batterie/affectation | Aucune batterie n'est proposée dans la récupération d'affectations |
| REQ-AIR-008 | Fournir un journal facultatif | Zéro événement n'empêche aucun usage ; les événements sont chronologiques |
| REQ-AIR-009 | Séparer journal et mouvements de stock | Un événement de journal seul ne modifie pas le stock |
| REQ-AIR-010 | Clôturer un aéronef avec une destination par équipement | Aucune clôture n'est possible avec une destination manquante |
| REQ-AIR-011 | Préserver les identités et l'historique | Aucun exemplaire ou référence n'est supprimé par la clôture |
| REQ-AIR-012 | Garantir l'atomicité de la clôture | Une erreur annule l'ensemble de la transaction |
| REQ-AIR-013 | Séparer les changements d’état des opérations de clôture | « Hors service » ne déclenche aucune récupération ; vente/retrait passent par l’action dédiée |
| REQ-AIR-014 | Consulter la flotte sous deux formes cohérentes | Vignettes et liste présentent les mêmes informations et ouvrent la même fiche |
| REQ-AIR-015 | Retrouver et filtrer les aéronefs | Recherche et filtres type, état opérationnel, cycle de vie et favoris sont combinables |
| REQ-AIR-016 | Organiser les aéronefs par état ou cycle de vie | Chaque groupe a un compteur et se replie ; hors service/vendus/retirés sont repliés par défaut |
| REQ-AIR-017 | Consulter une fiche complète intégrée à la navigation | La fiche regroupe informations, configuration, modification, journal et actions du cycle de vie |

## 11. Principes techniques à respecter

- Migrations SQLite additives et non destructives.
- Réutilisation du mécanisme existant d'affectation et de mouvements.
- Pas de second système parallèle d'affectation.
- Transaction SQLite unique pour la clôture et ses conséquences.
- Les règles métier sont contrôlées côté service, pas uniquement dans l'interface.
- Les tests couvrent les bases existantes, les opérations partielles, l'annulation, les erreurs transactionnelles et l'absence de perte d'identité.

## 12. Découpage de réalisation

| Lot | Contenu | Dépendance |
|---|---|---|
| A — Ergonomie | Actions d'ajout, raccourcis familles, modale Nouvel avion | Aucune |
| B — Typologie, états et favoris | Modèle aéronef, migration, affichage des favoris | Aucune |
| C — Journal de bord | Événements facultatifs et chronologie | B recommandé |
| D — Récupération | Sélection, désaffectation, disponibilité et historique | Mécanisme d'affectation existant |
| E — Vente et retrait | Clôture, destinations individuelles, transaction atomique | D |
| F — Refonte de Ma Flotte | Vignettes/liste, fiche intégrée, recherche, filtres et groupes repliables | E |

Chaque lot est développé dans une branche dédiée issue de `develop`, livré par PR et soumis à validation avant fusion. Le lot E dépend de la stabilisation du lot D.
