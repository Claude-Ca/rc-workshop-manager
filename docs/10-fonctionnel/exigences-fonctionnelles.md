# Exigences fonctionnelles — V1

**Statut :** exigences issues du cadrage du 2026-11-04 ; revue propriétaire attendue  
**Périmètre :** version gratuite V1 de RC Workshop Manager  
**Référence :** `docs/10-fonctionnel/besoins-et-perimetre.md`

Ce document transforme les décisions de cadrage en exigences identifiées et vérifiables. Les exigences décrivent le comportement attendu, pas nécessairement l'état actuel du code.

Priorités :
- **Fondamentale** : nécessaire à la cohérence du produit V1.
- **Haute** : fonction attendue dans la V1.
- **Moyenne** : utile, mais peut être planifiée après les parcours fondamentaux.

## 1. Positionnement et périmètre

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-CAD-001 | Le produit V1 est un gestionnaire d'atelier spécialisé dans l'aéromodélisme, destiné d'abord à l'aéromodéliste individuel. | Fondamentale | Les écrans, libellés et fonctions V1 sont cohérents avec la gestion d'un atelier et d'un parc aéromodélistes. |
| REQ-CAD-002 | L'application fonctionne localement et hors ligne ; chaque inventaire constitue un périmètre de données indépendant. | Fondamentale | Deux inventaires ouverts successivement ne partagent aucune donnée métier. |
| REQ-CAD-003 | Un inventaire de club peut être géré séparément de l'inventaire personnel, sans collaboration simultanée. | Haute | Les matériels personnel et club restent dans leurs inventaires respectifs ; aucun compte ou accès concurrent n'est requis. |
| REQ-CAD-004 | La V1 ne prend pas en charge les voitures, bateaux ou autres disciplines RC. | Fondamentale | Aucun parcours ni modèle métier spécifique à ces disciplines n'est requis pour la V1. |

## 2. Matériel, références et exemplaires

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-MAT-001 | Le catalogue distingue une référence descriptive d'un exemplaire physique individuel. | Fondamentale | Plusieurs exemplaires peuvent partager une référence sans partager leur identité, leur état ou leur affectation. |
| REQ-MAT-002 | Les équipements suivis individuellement disposent d'une fiche propre. | Haute | Un exemplaire possède au minimum une référence, un état et peut comporter un identifiant, un numéro de série, un emplacement et des notes. |
| REQ-MAT-003 | Un équipement affectable ne peut avoir qu'une seule affectation active à la fois. | Fondamentale | Une tentative de double affectation est refusée ou nécessite d'abord de terminer l'affectation existante. |
| REQ-MAT-004 | Un équipement démonté d'un modèle peut être remis en stock sans perdre son identité. | Haute | Après désaffectation, la fiche de l'exemplaire subsiste et son état courant reflète sa disponibilité. |

## 3. Affectation et compatibilité

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-AFF-001 | Les moteurs, récepteurs, ESC, servos et hélices peuvent être affectés individuellement à un modèle. | Haute | La fiche du modèle présente les équipements qui lui sont effectivement affectés. |
| REQ-AFF-002 | Les batteries sont suivies individuellement et peuvent être compatibles avec plusieurs modèles sans leur être affectées. | Fondamentale | Une batterie peut être liée comme compatible au Tucano et au Carbon-Z sans apparaître comme installée sur l'un ou l'autre. |
| REQ-AFF-003 | La compatibilité est distincte de l'affectation et ne réserve pas un équipement. | Fondamentale | Ajouter ou retirer une compatibilité ne modifie ni le stock ni l'affectation de l'exemplaire. |
| REQ-AFF-004 | Les batteries du club sont gérées dans l'inventaire du club, indépendamment des batteries personnelles. | Fondamentale | Aucun partage ou transfert automatique de batterie entre inventaires n'est possible ou implicite. |

## 4. Fournitures et consommables

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-STK-001 | Les fournitures et consommables sont gérés par référence avec un état binaire : en stock ou rupture. | Fondamentale | L'utilisateur peut déclarer une référence disponible ou en rupture sans créer d'exemplaires individuels. |
| REQ-STK-002 | Les fournitures et consommables ne sont pas affectés aux modèles. | Fondamentale | Aucune affectation individuelle à un avion n'est requise pour ces catégories. |
| REQ-STK-003 | Les hélices sont gérées comme des équipements individuels et non comme des consommables. | Fondamentale | Une hélice peut être identifiée, placée en stock ou affectée à un modèle. |

## 5. Outillage

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-OUT-001 | Chaque outil est géré individuellement avec une fiche légère. | Haute | Deux outils de même référence peuvent être distingués individuellement. |
| REQ-OUT-002 | Un outil possède un statut parmi Disponible, Prêté et En réparation. | Fondamentale | L'utilisateur peut modifier le statut et visualiser immédiatement la disponibilité correspondante. |
| REQ-OUT-003 | La V1 ne requiert pas de gestion détaillée des emprunteurs, échéances ou interventions. | Moyenne | Le statut Prêté ou En réparation suffit à signaler l'indisponibilité. |

## 6. Historique sélectif

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-HIS-001 | L'application enregistre automatiquement les événements métier significatifs. | Haute | Une entrée, affectation/désaffectation, évolution significative d'état, archivage ou retour de réparation produit un événement pertinent. |
| REQ-HIS-002 | Les consultations et modifications descriptives mineures ne produisent pas d'événements d'historique. | Haute | Consulter une fiche, modifier une note ou un emplacement ne génère pas d'événement métier. |
| REQ-HIS-003 | L'historique est consultable par équipement. | Haute | L'utilisateur peut retrouver les événements associés à un exemplaire donné. |
| REQ-HIS-004 | L'utilisateur peut supprimer un événement isolé ou purger l'historique. | Haute | L'événement choisi disparaît ; une purge globale demande une confirmation explicite. |
| REQ-HIS-005 | La suppression de l'historique ne modifie jamais l'état courant du matériel. | Fondamentale | Après purge, les stocks, statuts, compatibilités et affectations restent identiques. |
| REQ-HIS-006 | L'historique V1 n'est pas une piste d'audit immuable. | Fondamentale | L'utilisateur conserve le contrôle de ses données et peut nettoyer l'historique. |

## 7. Inventaires et protection des données

| ID | Exigence | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-DAT-001 | Les données de deux inventaires sont strictement isolées. | Fondamentale | Une création, modification, purge ou suppression dans un inventaire n'affecte aucun autre inventaire. |
| REQ-DAT-002 | Les migrations de base sont additives et ne suppriment pas silencieusement les données utilisateur. | Fondamentale | Une mise à jour conserve les données préexistantes ou signale explicitement une incompatibilité. |
| REQ-DAT-003 | La sauvegarde, la restauration et l'export de base restent disponibles dans la version gratuite. | Fondamentale | Un utilisateur gratuit peut sauvegarder et restaurer ses données sans abonnement. |

## 8. Offre gratuite et évolutions possibles

| ID | Exigence / principe | Priorité | Critère d'acceptation |
|---|---|---|---|
| REQ-OFF-001 | La version gratuite doit permettre une gestion complète et utile d'un atelier personnel d'aéromodélisme. | Fondamentale | Les parcours fondamentaux de gestion du parc et du matériel sont utilisables sans paiement. |
| REQ-OFF-002 | Les fonctions essentielles ne sont pas artificiellement limitées pour pousser vers une offre payante. | Fondamentale | La sauvegarde, la restauration, l'export de base et la gestion fondamentale restent accessibles gratuitement. |
| REQ-OFF-003 | L'architecture peut permettre de différencier ultérieurement des capacités d'offre sans introduire maintenant un système de licence complexe. | Moyenne | Les règles métier ne dépendent pas de conditions commerciales dispersées ; aucune activation payante n'est requise en V1. |
| REQ-OFF-004 | Les fonctions Premium potentielles restent des pistes à valider après observation du marché. | Moyenne | Aucune fonction avancée non validée n'est considérée comme un engagement de livraison V1. |

## 9. Traçabilité de validation

Le statut de réalisation et les preuves de test seront renseignés au fil du développement. Une exigence cadrée n'est pas automatiquement une fonction implémentée ou validée.

| Statut | Signification |
|---|---|
| À spécifier | Formulation ou critère incomplet |
| Spécifiée | Exigence définie, non encore implémentée |
| Implémentée | Fonction présente dans le code |
| Vérifiée | Critère d'acceptation exécuté avec succès |
| Validée | Parcours accepté par le propriétaire |

La validation fonctionnelle Windows, les tests automatisés et l'acceptation propriétaire sont trois preuves distinctes.
