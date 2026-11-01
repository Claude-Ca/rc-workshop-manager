# Besoins et périmètre fonctionnel

**Statut :** cadrage validé — spécification détaillée à compléter

## Objectif

Application Windows locale pour inventorier les composants RC, connaître leur disponibilité, les retrouver et savoir sur quel appareil/projet ils sont utilisés.

## Concepts métier

- **Référence catalogue** : type commercial (ex. batterie LiPo 4S 5000 mAh).
- **Exemplaire** : objet physique suivi individuellement (ex. BAT-014, RX-007).
- **Lot/quantité** : stock de composants interchangeables (ex. 30 charnières).
- **Avion** : modèle de la flotte.
- **Projet** : construction, modification ou réparation.
- **Emplacement** : localisation physique facultative (armoire, tiroir, boîte, étagère).
- **Mouvement** : entrée, sortie, réservation, installation, démontage, transfert ou ajustement.

## États

Disponible/en stock, installé sur un avion, réservé pour un projet, à réparer/hors service, consommé/sorti. L'état est géré au niveau pertinent : exemplaire individuel ou quantité de lot.

## Suivi individuel ou quantitatif

Suivi individuel lorsque l'identité et l'historique ont une valeur : récepteurs, batteries, moteurs et équipements configurés. Chaque exemplaire reçoit un identifiant unique. Pour les récepteurs, le code inventaire doit pouvoir correspondre au nom utilisé dans la RadioMaster TX16 (ex. RX-007).

Les consommables et petites pièces (charnières, visserie, chapes, balsa, gaines, connecteurs en vrac) sont gérés en quantités, éventuellement par lot ou emplacement. Une même référence peut avoir des exemplaires et un stock quantitatif.

## Catégories initiales

Motorisation, électronique, batteries, hélices, connectique, commandes, structure, matériaux, construction, outillage et divers. Les attributs techniques sont propres à chaque famille et extensibles.

## Navigation attendue

Tableau de bord, catalogue visuel par catégories, recherche et filtres, fiches détaillées avec photos facultatives, gestion des avions/projets, localisation physique facultative et historique des mouvements.

## Exigences d'évolution à traiter

Ces demandes sont implémentées dans la branche de fonctionnalité et soumises à validation automatisée puis aux essais fonctionnels du propriétaire avant d’être déclarées livrées.

- **CAT-MNT-01 — Modifier une référence catalogue :** permettre de modifier les propriétés descriptives d'une référence, notamment sa désignation. Les exemplaires et lots doivent rester liés à l'identifiant stable de la référence ; les libellés affichés doivent provenir de la référence mise à jour, sans recopier les propriétés descriptives dans chaque exemplaire.
- **CAT-MNT-02 — Supprimer une référence catalogue :** demander confirmation. Si des exemplaires, lots ou mouvements historiques y font référence, archiver la référence, conserver les liens et l’historique et empêcher de l’utiliser pour de nouveaux exemplaires. Une référence sans dépendance peut être supprimée définitivement.
- **AIR-MNT-01 — Modifier un avion :** permettre de modifier les propriétés d'un avion existant sans changer son identifiant, ni perdre les affectations des équipements.
- **AIR-MNT-02 — Enrichir la fiche avion :** ajouter un champ d'immatriculation UAF facultatif, modifiable et persistant. Le champ ne doit pas être rendu obligatoire tant que le besoin métier ne l'exige pas.

## Critères d'acceptation du premier incrément

- Créer, modifier, consulter et archiver une référence.
- Ajouter une photo locale facultative.
- Gérer un consommable par quantité.
- Créer un exemplaire individuel avec identifiant unique.
- Affecter/désaffecter un exemplaire à un avion ou réserver à un projet.
- Retrouver un récepteur par son identifiant TX16.
- Afficher correctement la disponibilité.
- Conserver les données après fermeture/redémarrage.

## Hors périmètre initial

Synchronisation cloud, application mobile, télémétrie batterie automatique, intégration directe TX16, compatibilité technique automatisée et multi-utilisateur.
