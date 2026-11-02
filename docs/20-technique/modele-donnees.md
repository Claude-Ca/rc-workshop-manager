# Modèle de données — état du périmètre

**Statut :** en revue  
**Périmètre :** implémentation de la branche `feature/multi-inventory-and-catalog-rework`

## Entités implémentées

- `ComponentReference` : désignation, catégorie, marque/modèle/description facultatifs, propriétés radio ou motorisation typées, attributs, photo facultative et statut d’archivage.
- `StockItem` : exemplaire individuel avec code inventaire unique, référence, état, série, emplacement, notes, identifiants d’avion/projet et nom TX16 éventuel.
- `StockLot` : quantité, unité et référence. Les fournitures et outils utilisent ce suivi quantitatif.
- `Aircraft` : nom, constructeur, modèle, notes et immatriculation UAF facultatifs.
- `Project` : nom, statut et notes.
- `StockMovement` : événements datés liés à une référence et, selon le cas, à un exemplaire, un lot, un avion ou un projet.

## Règles métier

- Une référence catalogue n’est pas un exemplaire physique.
- Les exemplaires reçoivent un identifiant unique généré selon la catégorie.
- Un RX a un nom TX16 unique; il peut être lié à zéro ou un TX.
- Un TX ne peut pas être affecté à un avion ou à un projet.
- Un exemplaire disponible peut être installé sur un avion ou réservé à un projet. Une seule affectation est active à la fois.
- Fournitures et outils sont gérés par quantité; ils ne sont pas affectés individuellement.
- Les quantités de lot sont entières et non négatives. Un ajustement conserve une trace de mouvement.
- L’archivage d’une référence conserve son identité pour préserver les références et l’historique.
- La suppression d’un exemplaire et les ajustements de quantité n’effacent pas les mouvements déjà enregistrés.
- Les migrations SQLite sont additives afin de conserver les données locales existantes.

## À distinguer du modèle futur

La base SQLite actuelle est locale à l’installation. Plusieurs bases indépendantes, leur sélection ou leur synchronisation ne sont pas implémentées dans cette branche.
