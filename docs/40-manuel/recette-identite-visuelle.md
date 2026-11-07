# Recette — première mouture de l’identité visuelle

Cette branche ajoute une barre de titre Electron compacte, les originaux de marque, et les premières icônes SVG. Elle conserve les libellés et catégories métier existants.

## Préparer l’application

Depuis la racine du dépôt, installer les dépendances puis lancer l’application de développement :

```powershell
pnpm install
pnpm --filter @rc-workshop/desktop dev
```

Pour vérifier la compilation distribuable, lancer `pnpm --filter @rc-workshop/desktop build`.

## Parcours à vérifier sous Windows

1. Vérifier la barre supérieure de 38 px : icône d’origine, nom « RC Workshop Manager », boutons réduire, agrandir/restaurer et fermer.
2. Déplacer la fenêtre par une zone vide de la barre. Double-cliquer la zone vide pour agrandir puis restaurer. Vérifier les bords de redimensionnement et les dimensions minimales.
3. Utiliser chaque bouton de fenêtre et vérifier que l’icône agrandir/restaurer suit l’état réel de la fenêtre.
4. Basculer entre thèmes clair et sombre. Fermer puis relancer l’application et vérifier que le choix reste mémorisé.
5. Au tableau de bord, vérifier que le logo d’origine est affiché dans le bandeau « Bienvenue dans ton atelier RC. » et que le texte garde son agencement à différentes largeurs.
6. Vérifier les icônes de navigation, des familles d’équipement et les six silhouettes d’aéronefs (avion, planeur, motoplaneur, hélicoptère, multirotor et autre) dans les favoris, la flotte et la fiche aéronef.
7. Parcourir les commandes avec Tab et Maj+Tab. Vérifier les libellés accessibles des boutons de fenêtre et du thème, ainsi que les contours de focus.

## Limites de cette première mouture

Le thème clair établit les couleurs des zones principales et des contrôles courants ; certaines pages ou composants secondaires peuvent encore nécessiter des ajustements. Les icônes d’action, d’état et de journal seront étendues progressivement après recette de cette base.
