# FAQ et limites

## L'application synchronise-t-elle les données entre ordinateurs ?

Non. L'application indique « Hors ligne · SQLite local ». Les bases se trouvent localement. Il n'y a pas de synchronisation cloud ou de collaboration simultanée documentée.

## Est-ce que « Hors service » libère automatiquement les équipements ?

Non. L'état opérationnel ne déclenche pas de récupération. Utilisez le parcours de récupération disponible dans la fiche ou, pour vente/retrait définitif, les actions dédiées qui demandent une décision par équipement.

## Le journal change-t-il le stock ou l'état ?

Non. Le journal est indépendant des mouvements et des états. Un événement incident/crash ne marque pas automatiquement l'aéronef hors service.

## Les batteries sont-elles installées sur les aéronefs ?

Non. Elles peuvent être marquées compatibles avec des aéronefs, mais la compatibilité n'est pas une affectation.

## Un export CSV suffit-il pour restaurer mon inventaire ?

Non. Pour restaurer, conservez et importez une copie SQLite compatible. Le CSV est un export tabulaire partiel; les catégories peuvent être sélectionnées.

## Puis-je annuler une vente ou un retrait ?

Aucun parcours d'annulation ou de réouverture après clôture n'est exposé dans l'interface documentée. Vérifiez le récapitulatif avant de confirmer.

## Quelles limites garder à l'esprit ?

- Quatre favoris maximum par inventaire.
- Le journal est une mémoire facultative et non un document réglementaire.
- Les données et photos sont locales à l'installation.
- Le registre multi-inventaires est séparé de chaque fichier SQLite exporté.
- Le manuel se consulte dans l'application sous Administration → Manuel utilisateur; son contenu Markdown est versionné sous docs/wiki/.
