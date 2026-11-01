# Plan de gestion de configuration (PGC)

**Identifiant :** PGC-RCWM-001  
**Version :** 1.0  
**Statut :** proposition soumise à validation du propriétaire  
**Périmètre :** code, données de référence, documentation, tests et versions livrables de RC Workshop Manager.

## 1. Objet

Ce plan définit comment identifier, faire évoluer, vérifier, approuver et livrer les éléments de configuration du projet. La démarche est proportionnée à un projet individuel, tout en reprenant les principes industriels de traçabilité, de maîtrise des changements, de reproductibilité et de conservation des preuves.

Objectifs :
- préserver l'intégrité du code et des données ;
- relier chaque évolution à un besoin, une décision ou un défaut ;
- éviter les modifications non revues sur les branches permanentes ;
- démontrer la qualité par des contrôles reproductibles ;
- retrouver précisément le contenu de chaque version publiée.

## 2. Éléments de configuration

| Identifiant | Éléments contrôlés | Référence / preuve |
|---|---|---|
| CFG-SW | Code TypeScript, React, Electron et scripts | Commit Git |
| CFG-DATA | Modèles métier, schéma SQLite et migrations | Code versionné et tests |
| CFG-IF | Contrats IPC et interfaces TypeScript | Code et tests de contrat |
| CFG-TEST | Tests et configuration de test | Référentiel Git et résultats CI |
| CFG-DOC | Besoins, architecture, manuel, décisions et plans | Documents versionnés |
| CFG-BUILD | Dépendances, fichiers de verrouillage, compilation et CI | Manifestes, lockfile et workflows |
| CFG-REL | Installateurs, archives et versions distribuées | Tag Git, artefacts et notes de version |

Les données privées de l'inventaire utilisateur ne sont pas des éléments livrés dans le dépôt. Elles restent locales. Toute évolution du schéma doit préserver les données existantes ou prévoir une migration explicite et testée.

## 3. Identification et références

- Le dépôt Git est la référence officielle du code et de la documentation.
- **main** porte les versions stables livrables ; **develop** porte l'intégration continue et sert de branche par défaut.
- Chaque changement est développé sur une branche dédiée.
- Un commit identifie un état exact du référentiel ; un tag immuable identifie une version publiée.
- Les dépendances doivent être reproductibles à partir des manifestes et du fichier de verrouillage.
- Les exigences sont documentées dans le domaine fonctionnel ; les décisions structurantes dans le registre des décisions.
- Les documents portent un statut explicite : Brouillon, En revue, Validé, À compléter ou Obsolète. Seul le propriétaire peut déclarer une proposition Validée.

## 4. Gestion des changements

### 4.1 Cycle nominal

1. Décrire le besoin, le défaut ou la dette technique.
2. Définir le périmètre, les critères d'acceptation et les impacts possibles : données, compatibilité, sécurité et documentation.
3. Créer une branche depuis la branche cible appropriée.
4. Implémenter le changement, ses tests et les mises à jour documentaires.
5. Ouvrir une Pull Request (PR) vers la branche cible, en expliquant le besoin, la solution, les risques et les preuves de vérification.
6. Attendre les contrôles CI et traiter les commentaires de revue.
7. Fusionner en Squash lorsque la PR est prête et la CI verte.
8. Vérifier l'intégration et mettre à jour la traçabilité et les notes de version si nécessaire.

Aucun changement fonctionnel ne doit être effectué directement sur **main** ou **develop**.

### 4.2 Branches

- **main** : versions stables et correctifs urgents.
- **develop** : intégration des évolutions.
- **feature/<sujet>** : nouvelle fonctionnalité, créée depuis develop, PR vers develop.
- **fix/<sujet>** : correctif ciblant une version stable, créé depuis main, PR vers main, puis report contrôlé vers develop.
- Les noms de branches sont courts, explicites et en minuscules avec tirets.
- Pas de force-push sur les branches permanentes ou partagées.

### 4.3 Commits et PR

Les messages suivent Conventional Commits : type(scope): description. Types usuels : feat, fix, docs, refactor, test, build, ci et chore. Les titres de PR suivent la même convention.

Chaque PR devrait préciser :
- le besoin et le comportement attendu ;
- les changements notables ;
- les tests ajoutés ou adaptés et leurs résultats ;
- les impacts sur les données, la migration, la documentation et la compatibilité ;
- les risques connus et les limites restant à traiter.

La fusion se fait en Squash après réussite de la CI et résolution des conversations de revue. Dans ce projet individuel, une approbation externe obligatoire n'est pas imposée ; la revue reste une étape de contrôle du changement.

## 5. Vérification et preuves

Le pipeline CI doit au minimum exécuter les tests automatisés, la vérification des types TypeScript et la compilation / le build.

Les tests couvrent les règles métier, les cas nominaux et les erreurs prévisibles. Une fonctionnalité qui touche SQLite doit considérer la persistance, les données historiques et la compatibilité avec une base existante.

Avant une version distribuée, le propriétaire réalise un essai fonctionnel sous Windows : lancement, opérations principales et persistance après redémarrage. La CI verte ne remplace pas cet essai réel.

Les preuves attendues sont les résultats CI liés au commit ou à la PR, les tests versionnés, les décisions enregistrées et, pour une version, le tag ainsi que les notes de version.

## 6. Gestion des données et migrations

- Les données d'inventaire restent locales et ne doivent pas être ajoutées au dépôt.
- Les modifications de schéma doivent être rétrocompatibles lorsque possible.
- Toute migration destructive doit être justifiée, testée et accompagnée d'une stratégie de sauvegarde ou de récupération.
- Une mise à jour ne doit pas effacer silencieusement les références, exemplaires, affectations ou mouvements existants.
- Les suppressions d'entités référencées suivent une règle métier explicite : archivage, blocage ou confirmation éclairée. Aucune suppression en cascade implicite.
- Les migrations sont testées sur une base neuve et sur une base issue d'une version précédente lorsque nécessaire.

## 7. Documentation et décisions

Les documents sont stockés sous docs/ et indexés par les README de leur domaine. Toute évolution qui modifie une exigence, une règle métier, une interface ou l'architecture met à jour les documents concernés.

Les décisions structurantes sont inscrites dans le registre des décisions avec contexte, options, décision, statut et date. Une décision proposée ne devient normative qu'après validation explicite du propriétaire.

## 8. Versionnement et livraison

- Version de développement initiale : 0.1.0 ; première version stable visée : 1.0.0.
- SemVer : MAJOR pour une rupture incompatible, MINOR pour une fonctionnalité compatible, PATCH pour un correctif compatible.
- Des préversions alpha, beta ou rc peuvent être utilisées.
- Un tag de version n'est créé qu'après CI verte, build réussi, vérification de l'installateur et essai fonctionnel Windows par le propriétaire.
- Les tags publiés sont immuables.
- Chaque livraison comprend la version, les principales évolutions, les corrections, les limites connues et les actions requises sur les données existantes.

## 9. Responsabilités

| Activité | Responsable |
|---|---|
| Priorisation des besoins et acceptation fonctionnelle | Propriétaire du projet |
| Implémentation et tests | Contributeur / agent de développement |
| Vérification CI et revue de PR | Contributeur, avec contrôle du propriétaire si nécessaire |
| Validation de la livraison Windows | Propriétaire du projet |
| Création du tag et publication | Propriétaire du projet |
| Approbation du présent plan et de ses révisions | Propriétaire du projet |

## 10. Dérogations et révision

Toute dérogation importante est expliquée dans la PR ou le registre des décisions. Le plan est révisé lorsque le workflow, l'architecture, la stratégie de livraison ou le niveau de risque évolue. Ses propres modifications suivent le processus normal de gestion de configuration.

## 11. Références associées

- [Règles de gestion de configuration](../00-gouvernance/regles-gestion-configuration.md)
- [Registre des décisions](../00-gouvernance/registre-decisions.md)
- [Besoins et périmètre fonctionnel](../10-fonctionnel/besoins-et-perimetre.md)
- [Plan de développement](plan-de-developpement.md)
