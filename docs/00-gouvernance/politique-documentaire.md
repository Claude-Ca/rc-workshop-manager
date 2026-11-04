# Politique documentaire

**Identifiant :** GOV-RCWM-001  
**Version du document :** 1.0  
**Dernière mise à jour :** 2026-11-04  
**Statut :** En revue  
**Périmètre :** organisation du référentiel documentaire et principes de qualité éditoriale

## Organisation

- `00-gouvernance/` : gouvernance du projet, décisions et politique documentaire.
- `10-fonctionnel/` : besoins, scénarios, règles métier et critères d'acceptation.
- `20-technique/` : architecture, données, contrats, sécurité et qualité.
- `30-plans/` : lots, roadmap, gestion de configuration et validation.
- `40-manuel/` : installation, développement et utilisation.
- `90-archives/` : documents remplacés conservés pour leur valeur historique.

Chaque domaine possède un README index. Les noms de fichiers sont explicites, en minuscules, sans accents et séparés par des tirets.

Les règles d'identification, de versionnement, d'en-tête et de statut des documents sont définies dans le [Plan de gestion de configuration](../30-plans/plan-gestion-configuration.md). La présente politique ne les duplique pas.

## Qualité éditoriale

- Distinguer les exigences validées, les propositions, les hypothèses et les questions ouvertes.
- Distinguer l'architecture cible de l'état réellement implémenté.
- Utiliser des liens internes relatifs et vérifier leur validité lors des évolutions documentaires.
- Vérifier les commandes et procédures du manuel sur l'environnement indiqué.
- Ne jamais documenter comme livré un comportement qui n'est pas présent dans le code ou dont la vérification n'est pas établie.
- Indiquer les références utiles (PR, commits, exigences ou décisions) sans confondre ces références avec l'identifiant du document.
