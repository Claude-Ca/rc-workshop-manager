# Plan de développement

**Version de travail :** 0.3.0  
**Branche de référence :** `develop`  
**Dernière mise à jour :** 2026-11-04

## État de référence

La PR #12, relative à l'administration des inventaires et au compactage SQLite, a été fusionnée par squash dans `develop` (commit `b4d3317`).

La PR #12 apporte notamment :
- gestion des inventaires depuis Administration et affichage de l'inventaire actif ;
- suppression d'un inventaire secondaire uniquement s'il est fermé, avec protection de l'inventaire principal et de l'inventaire actif ;
- compactage manuel de la base SQLite active avec compte rendu des tailles avant/après.

La CI de la PR #12 était verte : tests, typecheck et build. Le propriétaire a également validé manuellement sous Windows les protections de suppression et le compactage.

La présente mise à jour documentaire consolide le cadrage fonctionnel V1. Elle ne prétend pas que toutes les exigences nouvelles sont déjà implémentées.

## Lots et avancement

| Lot | Contenu | État | Preuve / reste à faire |
|---|---|---|---|
| 1. Fondation | Monorepo pnpm, TypeScript, Electron/React, CI, gouvernance | Réalisé | PR #1 et workflow CI |
| 2. Domaine métier initial | Références, exemplaires, stocks, affectations, mouvements | Intégré | Parcours à poursuivre en recette |
| 3. Catalogue et flotte | Catégories, motorisation, radio TX/RX, avions, projets, aperçu | Intégré | Vérification fonctionnelle détaillée |
| 4. Persistance locale | SQLite, migrations additives, repository et IPC desktop | Intégré | Non-régression des anciennes bases à confirmer |
| 5. Inventaires multiples | Registre local, création, ouverture, import par copie, reprise du dernier inventaire | Intégré | Isolation et import à valider dans la campagne complète |
| 6. Export et administration | Copie SQLite, CSV, reset avec sauvegarde préalable, suppression d'inventaire secondaire, compactage | Intégré en partie | PR #12 validée pour suppression protégée et compactage ; compléter la recette export/reset |
| 7. Cadrage fonctionnel V1 | Positionnement aéromodélisme, atelier personnel, familles de matériel, compatibilité, outillage, historique, offre gratuite | Spécifié dans cette révision | Relecture et validation propriétaire |
| 8. Compléments métier V1 | Compatibilité des batteries, suivi individuel des hélices, statuts d'outillage, historique sélectif et purge | À analyser / planifier | Comparer les exigences à l'implémentation actuelle avant de découper les PR |
| 9. Validation fonctionnelle Windows | Parcours bout en bout, persistance, sauvegarde/restauration, données existantes | À faire | Campagne de recette propriétaire |
| 10. Stabilisation et release | Corrections issues de recette, packaging/installateur, procédure de mise à jour et sauvegarde | À cadrer | Pas de release déclarée à ce stade |

## Campagne de recette prioritaire

À réaliser dans un ordre limitant les risques pour les données :

1. **Préparation sûre** : sauvegarder le répertoire de données existant ; utiliser d'abord des bases de test, pas l'inventaire réel.
2. **Inventaires** : créer deux bases, saisir des données distinctes, basculer entre elles, fermer/redémarrer et vérifier la reprise du dernier inventaire.
3. **Import** : importer une copie d'une base de test ; vérifier que le fichier source n'est pas modifié et que les données importées sont cohérentes. Vérifier aussi le refus d'un fichier vide, non SQLite ou de structure incompatible, sans entrée orpheline dans le registre.
4. **Catalogue et matériel** : références, exemplaires individuels, fournitures/consommables, hélices, outillage et statuts.
5. **Affectations et compatibilités** : installer un moteur ou un récepteur sur un modèle ; désaffecter ; déclarer une batterie compatible avec plusieurs modèles sans l'affecter.
6. **Radio et flotte** : émetteurs/récepteurs, bind, affectations, aperçu avion et projets.
7. **Historique** : vérifier les événements produits par les actions significatives ; vérifier l'absence d'événements pour une consultation ou une modification descriptive ; purger un événement et l'historique complet ; vérifier que l'état courant ne change pas.
8. **Exports** : ouvrir la sauvegarde SQLite exportée dans une copie de test ; vérifier le CSV dans un tableur et ses filtres.
9. **Réinitialisation** : uniquement sur une base jetable ; vérifier la création de la sauvegarde avant remise à zéro et l'intégrité des autres inventaires.
10. **Résilience** : redémarrage, migrations depuis l'ancienne base, erreurs d'import et chemins/photos.

## Principes de développement produit

- Prioriser une version gratuite cohérente et utile pour l'atelier personnel d'un aéromodéliste.
- Ne pas développer les fonctions Premium potentielles avant d'avoir validé leur valeur.
- Préserver la portabilité des données : sauvegarde, restauration et export de base ne doivent pas être conditionnés à une offre payante.
- Prévoir une séparation technique possible des capacités futures, sans mettre en place prématurément paiement, licence ou authentification.
- Ne pas généraliser la V1 aux voitures ou bateaux RC ; ces domaines pourraient faire l'objet de projets distincts réutilisant certaines briques.

## Points ouverts / risques identifiés

- Comparer les exigences fonctionnelles nouvellement spécifiées avec le code réellement présent avant d'annoncer leur réalisation.
- Définir précisément les transitions d'état autorisées pour les équipements et l'outillage.
- Définir le contenu minimal des événements d'historique et la portée de la purge.
- Vérifier la cohérence des migrations SQLite nécessaires aux évolutions du modèle.
- Documenter une procédure simple de restauration d'une sauvegarde SQLite et décider si le registre multi-inventaires doit aussi être sauvegardé.
- Vérifier le comportement des photos lors d'une sauvegarde, d'un import et d'un déplacement de base.
- Définir le périmètre exact du packaging Windows, de l'installation et des mises à jour avant une première release.

## Évolutions hors V1

Les fonctions réseau (serveur hébergé, comptes, rôles, collaboration et synchronisation) restent hors périmètre. Elles nécessiteront un cadrage fonctionnel et une décision d'architecture dédiés ; l'API IPC actuelle ne doit pas être présentée comme une API réseau.

La gestion d'autres disciplines RC n'est pas prévue dans RC Workshop Manager V1. Une application dédiée pourrait être étudiée ultérieurement à partir des briques réutilisables du projet.
