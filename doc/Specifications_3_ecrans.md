# Spécifications des 3 écrans du flipper

## Contexte

Ce document regroupe les spécifications techniques observées sur les écrans de debug du flipper physique.

Le projet utilise trois écrans distincts :

- `Backglass` : écran supérieur principal ;
- `DMD` : écran central plus petit pour les informations de jeu ;
- `Playfield` : écran principal incliné du plateau de jeu.

Ces informations servent de référence pour adapter l'affichage frontend aux dimensions réelles de la machine.

## Résumé

| Écran | Rôle | Résolution viewport | Résolution display | Ratio | Source kiosk |
|---|---|---:|---:|---:|---|
| Backglass | Écran supérieur | 1920 x 1080 px | 1920 x 1080 px | 1.778 (16:9) | `localhost:32789/?screen=backglass` |
| DMD | Écran central | 1920 x 1080 px | 1920 x 1080 px | 1.778 (16:9) | `localhost:32789/?screen=dmd` |
| Playfield | Plateau principal | 2160 x 3840 px | 2160 x 3840 px | 0.563 (9:16) | `localhost:32789/?screen=playfield` |

## Spécifications communes

Les informations suivantes sont communes aux écrans observés :

```text
Pixel ratio : 1.00
Color depth : 24-bit
Flipper IP  : 100.125.185.88
Dashboard   : http://100.125.185.88:8080
Network     : ONLINE
Browser     : Chrome 148
```

## Écran Backglass

### Rôle

```text
BACKGLASS
```

Le Backglass correspond à l'écran supérieur principal du flipper.

Il est destiné à afficher les éléments visuels importants liés à l'univers du jeu, par exemple :

- le boss de la phase ;
- les animations narratives ;
- les effets visuels de phase ;
- l'ambiance générale du monde actif.

### Spécifications observées

```text
Viewport    : 1920 x 1080 px
Display     : 1920 x 1080 px
Aspect      : 1.778 (16:9)
Pixel ratio : 1.00
Color depth : 24-bit
Kiosk src   : localhost:32789/?screen=backglass
```

### Notes d'intégration

L'affichage doit être pensé en format paysage `16:9`.

Le contenu important ne doit pas être collé aux bords, car l'écran est intégré dans le meuble du flipper et peut avoir des zones visuellement moins confortables près du cadre.

## Écran DMD

### Rôle

```text
DMD
```

Le DMD correspond à l'écran central situé entre le Backglass et le Playfield.

Dans notre gameplay, il sert à afficher les informations courtes et directement utiles pendant la partie.

Exemples d'informations prévues :

- score ;
- points gagnés ;
- combos ;
- multiplicateur ;
- balles restantes.

Les quêtes, les HP du joueur et les informations du boss sont affichés sur le Backglass.

### Spécifications observées

```text
Viewport    : 1920 x 1080 px
Display     : 1920 x 1080 px
Aspect      : 1.778 (16:9)
Pixel ratio : 1.00
Color depth : 24-bit
Kiosk src   : localhost:32789/?screen=dmd
```

### Notes d'intégration

Même si la résolution observée est `1920 x 1080 px`, le DMD est physiquement plus petit que le Backglass.

Il faut donc éviter les textes trop longs.

Recommandations :

- utiliser des informations courtes ;
- limiter le nombre de lignes affichées ;
- privilégier les labels simples ;
- éviter les phrases longues pendant le gameplay ;
- utiliser une typographie très lisible ;
- garder un contraste fort.

Exemple de structure adaptée :

```text
SCORE
12 500
BALLES 3/3
```

Lors d'un combo :

```text
COMBO x3
+1 500
SCORE 6 250
```

La taille des trois lignes doit s'adapter automatiquement à la quantité de caractères et à la largeur de l'écran.

## Écran Playfield

### Rôle

```text
PLAYFIELD
```

Le Playfield correspond à l'écran principal incliné du flipper.

C'est l'écran sur lequel le joueur voit le plateau de jeu, la bille, les flippers, les bumpers, les rampes et les zones d'impact.

### Spécifications observées

```text
Viewport    : 2160 x 3840 px
Display     : 2160 x 3840 px
Aspect      : 0.563 (9:16)
Pixel ratio : 1.00
Color depth : 24-bit
Kiosk src   : localhost:32789/?screen=playfield
```

### Notes d'intégration

L'affichage doit être pensé en format portrait `9:16`.

C'est l'écran principal de gameplay. Il doit donc rester prioritaire pour :

- la lisibilité de la bille ;
- la lisibilité des obstacles ;
- la compréhension des zones d'impact ;
- les rampes et couloirs ;
- les effets visuels liés au score et aux quêtes.

Les informations de HUD doivent être limitées sur cet écran pour ne pas cacher le plateau.

## Répartition fonctionnelle recommandée

| Écran | Contenu principal recommandé |
|---|---|
| Backglass | Boss, quêtes, HP joueur, ambiance et animations narratives |
| DMD | Score, points gagnés, combos, multiplicateur et balles |
| Playfield | Plateau jouable, bille, flippers, bumpers, rampes, targets, portails |

## URLs locales observées

```text
Backglass : localhost:32789/?screen=backglass
DMD       : localhost:32789/?screen=dmd
Playfield : localhost:32789/?screen=playfield
```

## Dashboard

Le dashboard de contrôle observé est disponible à l'adresse suivante :

```text
http://100.125.185.88:8080
```

## Points d'attention

- Les trois écrans utilisent Chrome `148` d'après les écrans de debug.
- Le pixel ratio observé est `1.00`, donc les dimensions CSS peuvent être pensées directement en pixels logiques.
- Le Playfield est en portrait, contrairement au Backglass et au DMD qui sont en paysage.
- Le DMD possède la même résolution observée que le Backglass, mais il doit rester traité comme une zone d'information compacte.
- Le frontend doit pouvoir différencier les écrans via le paramètre `screen` dans l'URL.

## Impact pour le développement frontend

Le frontend doit pouvoir adapter son rendu selon :

```text
?screen=backglass
?screen=dmd
?screen=playfield
```

Cela permet d'avoir une interface spécifique à chaque écran au lieu d'afficher le même contenu partout.

À terme, chaque écran devrait avoir son propre rôle :

```text
Backglass -> écran boss / narration
DMD       -> écran score / état de partie
Playfield -> écran gameplay principal
```
