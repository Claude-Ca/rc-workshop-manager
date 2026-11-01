# Plan de développement

**Version de travail :** 0.1.0

## Lots

1. Fondation : gouvernance, documentation, monorepo, CI et conventions.
2. Backend métier : références, lots/exemplaires, affectations, mouvements et tests.
3. Frontend : navigation, tableau de bord, catalogue visuel, fiches et formulaires.
4. Persistance desktop : SQLite, migrations, photos locales et IPC sécurisé.
5. Flotte et projets : avions, projets et affectations.
6. Validation Windows : packaging, installation, persistance, sauvegarde et essai utilisateur.

## Critère de sortie du premier test fonctionnel

L'utilisateur doit pouvoir lancer l'application Windows, créer une référence, ajouter des exemplaires ou une quantité de lot, associer un récepteur à un avion, consulter une fiche avec photo facultative, fermer puis relancer et retrouver les données. Aucun lot n'est déclaré terminé sans tests automatisés et vérification fonctionnelle.
