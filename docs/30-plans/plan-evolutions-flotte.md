# Plan des évolutions de la flotte

**Identifiant :** PLN-RCWM-002  
**Version :** 1.0  
**Date :** 2026-11-05  
**Statut :** Validé pour réalisation  
**Référence fonctionnelle :** [Évolution de la flotte et cycle de vie des aéronefs](../10-fonctionnel/evolution-flotte-et-cycle-de-vie.md)

Ce plan complète le [plan de développement V1](plan-de-developpement.md). Les lots décrits sont des évolutions à réaliser ; ils ne sont pas réputés implémentés tant que leurs PR et critères d'acceptation ne sont pas vérifiés et validés.

## État de référence

- PR #16 — caractéristiques de batterie et vue inventaire — fusionnée dans `develop`.
- PR #17 — documentation du cycle de vie de la flotte — fusionnée dans `develop`.
- PR #18 — ergonomie de l'inventaire et création des avions — fusionnée dans `develop`.
- PR #19 — typologie, états, favoris et photos d'aéronefs — fusionnée dans `develop`.
- PR #20 — journal de bord facultatif des aéronefs — fusionnée dans `develop` (commit `7557eeb`).
- Les caractéristiques facultatives de batterie (connecteur, taux de décharge, dimensions, poids) sont portées par la référence catalogue ; les compatibilités restent portées par les exemplaires et ne sont pas des affectations.

## Lots à réaliser

| Lot | Branche suggérée | Contenu | Dépendance | Priorité |
|---|---|---|---|---|
| A — Ergonomie | `feature/inventory-and-fleet-ux` | Déplacement de l'ajout dans Inventaire, recherche redimensionnée, raccourcis + par famille, modale Nouvel avion | Aucune | Haute |
| B — Typologie, états et favoris | `feature/aircraft-classification-and-favorites` | Type, état opérationnel, cycle de vie, quatre favoris maximum par inventaire et affichage sur la vue d'ensemble | Aucune | Haute |
| C — Journal de bord | `feature/aircraft-logbook` | Événements facultatifs, ajout/modification et chronologie | B recommandé | Moyenne |
| D — Récupération des équipements | `feature/aircraft-equipment-recovery` | Récupération sélective, désaffectation, remise à disposition et mouvements | Affectations existantes | Haute |
| E — Vente et retrait | `feature/aircraft-retirement-and-sale` | Clôture, destination individuelle de chaque équipement, transaction atomique et historique | D | Haute |

## État d'avancement des lots

- Lot A — Ergonomie : implémenté par PR #18, fusionné dans `develop`.
- Lot B — Typologie, états et favoris : implémenté par PR #19, fusionné dans `develop`.
- Lot C — Journal de bord : implémenté par PR #20, fusionné dans `develop`.
- Lot D — Récupération des équipements : fusionné dans `develop`.
- Lot E — Vente et retrait : implémenté sur la PR #22, en attente de recette UI et de validation. L'aperçu sépare la configuration, le bouton du journal (fenêtre défilante indépendante avec focus initial) et la gestion du cycle de vie ; les décisions de vente/retrait restent confirmées dans un parcours transactionnel dédié. La modification de fiche est accessible depuis l'aperçu et les boutons Aperçu / Modifier sont alignés dans les cartes.
- Le changement d'état opérationnel vers « Hors service » ne clôture pas l'aéronef et ne récupère aucun équipement.
- Lot D : la disponibilité seule est colorée en vert ; le nombre total d'exemplaires conserve la couleur normale.
- Lot D : le statut local SQLite est regroupé en haut à droite ; le pied de page est réservé à la version et au lien vers le code source.

## Après la RC — bibliothèque d'illustrations d'équipements

Prévoir un lot post-RC distinct pour produire une bibliothèque cohérente d'illustrations générées par IA. Aucun visuel généré n'est requis pour la RC.

- Définir une charte commune (cadrage, fond, lumière, style, palette et niveau de détail) et des consignes par famille d'équipement.
- Prévoir une illustration de repli intégrée pour chaque famille et un comportement propre lorsqu'une image manque.
- Maîtriser le stockage : assets versionnés et optimisés, nomenclature stable et taille totale plafonnée ; ne pas générer ni télécharger d'images à l'exécution.
- Vérifier les droits et conditions d'utilisation de l'outil de génération ainsi que les éventuelles marques/logos avant publication.
- Valider le rendu dans les cartes et fiches, le contraste et le poids du paquet avant livraison.

## Stratégie de réalisation

1. Traiter un seul lot à la fois.
2. Créer chaque branche depuis le dernier `develop` validé.
3. Lire le code et les tests existants avant toute modification du modèle.
4. Définir les migrations additives et les tests de non-régression avant l'implémentation UI.
5. Mettre à jour exigences, modèle de données et manuel utilisateur dans la PR concernée.
6. Exécuter tests, typecheck et build.
7. Présenter la PR et ses preuves de validation au propriétaire.
8. Ne fusionner qu'après validation explicite du propriétaire.

## Points de vigilance

- Ne pas confondre état opérationnel et cycle de vie.
- Les batteries ne sont jamais des équipements affectés à un aéronef ; leur compatibilité reste une relation distincte.
- Le journal de bord ne génère pas automatiquement de mouvement de stock.
- Un changement vers « Hors service » ou « Retiré » doit traiter tous les équipements encore affectés, sans suppression physique implicite.
- Une récupération partielle ne doit modifier que les équipements sélectionnés.
- La clôture doit être transactionnelle et conserver les références ainsi que les identités des exemplaires.
- Les données des inventaires restent strictement isolées ; les favoris sont donc limités par inventaire.

## Traçabilité

Les statuts de réalisation seront renseignés dans les PR et dans le plan de développement général. Le statut « Validé pour réalisation » du présent document signifie que le périmètre fonctionnel est approuvé ; il ne vaut pas acceptation des futures implémentations.
