# Besoins et périmètre fonctionnel

**Statut :** en revue  
**Périmètre :** branche `feature/multi-inventory-and-catalog-rework`

## Objectif

Application Windows locale et hors ligne pour inventorier le matériel d’aéromodélisme, connaître les quantités disponibles, retrouver les équipements et savoir sur quel avion ou projet ils sont utilisés.

## Utilisateurs et usage

L’application est destinée à un atelier individuel. Les données sont enregistrées localement dans SQLite et restent disponibles après fermeture puis redémarrage de l’application.

## Concepts métier

- **Référence catalogue :** description d’un type de composant, avec désignation et propriétés facultatives.
- **Exemplaire :** objet physique suivi individuellement, avec un code inventaire généré, un numéro de série facultatif et des notes.
- **Stock quantitatif :** quantité d’un consommable, d’une fourniture ou d’un outil, avec unité et quantité modifiable.
- **Avion :** modèle de la flotte auquel des équipements peuvent être affectés.
- **Projet :** construction, modification ou réparation pour laquelle un équipement peut être réservé.
- **Mouvement :** entrée, installation, réservation, libération, ajustement ou suppression d’un exemplaire, conservés dans l’historique.

## Références et catégories

Le catalogue comprend les catégories moteur/hélice, ESC, radio, servo, batterie, fourniture, outil et divers. Les anciennes catégories importées restent lisibles via leur famille de compatibilité.

Une référence peut avoir une marque, un modèle, une description et une image facultatifs. Les propriétés techniques sont propres à la catégorie :

- Moteur : électrique avec tension, ou Glow avec cylindrée.
- Hélice : diamètre et pas en pouces.
- Émetteur radio : nombre de voies, protocoles et firmware facultatif.
- Récepteur radio : nombre de voies et protocole obligatoires.

Une référence utilisée dans le stock ou l’historique ne peut pas être supprimée définitivement. Elle est archivée afin de préserver les liens et mouvements. Une référence sans dépendance peut être supprimée.

## Exemplaires individuels

Les batteries, moteurs, radios, servos, ESC et autres équipements traçables sont ajoutés individuellement. Chaque exemplaire reçoit un code inventaire unique adapté à sa catégorie (par exemple RX-001, TX-001, MOT-001 ou PROP-001).

Un exemplaire peut être modifié, supprimé avec confirmation, installé sur un avion, réservé pour un projet, puis libéré. Sa fiche permet de modifier le numéro de série, l’emplacement, les notes et, pour un récepteur, son nom dans la TX16. La suppression conserve une trace dans l’historique.

Les récepteurs sont suivis individuellement. Leur nom TX16 est unique parmi les récepteurs. Un récepteur peut être lié à un émetteur; la liaison peut être retirée. Un émetteur ne peut pas être installé sur un avion ni réservé pour un projet.

## Fournitures, consommables et outils

Les fournitures et les outils/équipements sont gérés dans une liste quantitative, sans exemplaires individuels ni affectation à un avion ou à un projet.

La création se fait en une étape avec une désignation, une quantité et une unité. Une nouvelle quantité portant le même nom dans la même catégorie s’ajoute au stock existant. Depuis la liste filtrée, l’utilisateur peut modifier directement la quantité, y compris la ramener à zéro. Les ajustements sont historisés.

Exemples : « Tube carbone 4 mm - 65 cm — Qté : 2 », « Corde à piano 2 mm — Qté : 3 », « Balsa — Qté : 8 plaques ».

## Avions et projets

Une fiche avion contient un nom, un constructeur, un modèle, des notes et une immatriculation UAF facultative. La vue de flotte affiche le récepteur affecté, s’il y en a un.

L’aperçu avion présente le récepteur, son émetteur lié, le moteur, l’hélice et l’ESC lorsqu’un moteur électrique est installé, ainsi que les autres équipements affectés.

Les projets peuvent être créés avec un statut planned, active, completed ou cancelled. Un exemplaire disponible peut être réservé à un projet ou installé sur un avion; un exemplaire ne peut avoir qu’une affectation active.

## Recherche, filtres et historique

L’inventaire peut être filtré par catégorie et recherché par désignation, marque ou modèle. Les fournitures et outils filtrés apparaissent dans leur liste quantitative simplifiée.

L’historique présente les mouvements datés. L’archivage d’une référence, la suppression d’un exemplaire et l’ajustement d’un stock ne détruisent pas les événements historiques correspondants.

## Critères d’acceptation

- [x] Créer, modifier, consulter, archiver et restaurer une référence.
- [x] Gérer les variantes moteur électrique, Glow et hélice avec leurs propriétés.
- [x] Créer, modifier, affecter, libérer et supprimer un exemplaire individuel.
- [x] Suivre un RX et le lier à un TX; afficher ce lien dans l’inventaire et l’aperçu avion.
- [x] Gérer fournitures et outils par désignation, quantité et unité, et ajuster le stock depuis leurs listes filtrées.
- [x] Créer et modifier les fiches avions, consulter leur équipement et réserver des exemplaires pour les projets.
- [x] Conserver les données au redémarrage de l’application.
- [x] Passer les tests, le typecheck et le build CI sur le dernier commit de la branche.

La vérification fonctionnelle Windows et la validation finale du propriétaire restent la dernière étape du périmètre.

## Hors périmètre

La gestion multi-base et la synchronisation entre plusieurs bases, utilisateurs ou appareils ne font pas partie de cette branche. Elles seront traitées dans un lot ultérieur. L’application mobile, la télémétrie batterie, l’intégration directe TX16 et la compatibilité technique automatisée restent également hors périmètre.
