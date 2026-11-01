# Modèle de données — principes

**Statut :** conceptuel, à détailler avant stabilisation du schéma SQL

## Entités

- `ComponentReference` : référence catalogue, catégorie, marque, modèle, description, attributs et médias.
- `StockItem` : exemplaire individuel, identifiant unique, référence, numéro de série éventuel, état et notes.
- `StockLot` : quantité non individualisée, unité, quantité disponible et emplacement éventuel.
- `Aircraft` : avion de la flotte.
- `Project` : construction, réparation ou évolution.
- `Location` : emplacement physique hiérarchique facultatif.
- `Assignment` : affectation temporelle d'un exemplaire ou d'une quantité.
- `StockMovement` : événement d'entrée, sortie, réservation, installation, démontage, transfert, ajustement ou consommation.
- `MediaAsset` : photo/document local associé à une référence, un exemplaire ou un avion.

## Règles d'intégrité

- Une référence catalogue n'est pas un objet physique.
- Un exemplaire possède un identifiant unique et au plus une affectation active.
- Un lot ne peut avoir une quantité négative.
- Les quantités réservées/installées ne sont pas disponibles.
- Les mouvements sont historisés ; corriger par ajustement plutôt que supprimer l'historique.
- Localisation indépendante de l'affectation et facultative.
- Le code TX16 d'un récepteur est explicite et unique parmi les récepteurs actifs ; valeur initiale proposée identique à son identifiant inventaire.
- Les attributs par catégorie restent typés et validés.
