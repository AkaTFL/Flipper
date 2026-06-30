# Écran DMD et score

## Rôle

Le DMD est l'écran central du playfield. Il affiche des informations courtes et immédiatement utiles pendant la partie, sans détourner l'attention du joueur.

Les quêtes, les points de vie et le boss sont affichés sur le Backglass. Le DMD reste consacré au score et au rythme de la partie.

## Informations affichées

Le DMD utilise trois lignes :

- un titre indiquant le type d'événement ;
- une valeur principale ;
- une information secondaire.

### État normal

```text
SCORE
12 500
BALLES 2/3
```

### Points gagnés

Après un impact rapportant des points, le gain apparaît temporairement :

```text
POINTS
+600
SCORE 12 500
```

Après environ `1,8 seconde`, le DMD revient au score total.

### Combos

```text
COMBO x2
+1 000
SCORE 3 250
```

Pour un multiplicateur `x4` ou supérieur, un écran `SUPER COMBO` met davantage en valeur l'événement.

## Couleurs du multiplicateur

| Multiplicateur | Couleur |
|---|---|
| `x1` | bleu-cyan |
| `x2` | vert |
| `x3` | orange |
| `x4+` | rouge |

La couleur reste appliquée à l'écran normal du score jusqu'à la perte du combo.

## Animations

- les points et les combos utilisent une pulsation courte ;
- le super combo ajoute une légère secousse ;
- le texte revient automatiquement à l'affichage normal du score.

## Affichage responsive

Le titre, la valeur principale et le texte secondaire adaptent automatiquement leur taille à la largeur disponible. Les valeurs longues restent à l'intérieur de l'écran, y compris pendant la pulsation.

## Messages WebSocket

### `score_update`

Utilisé pour :

- le score total ;
- les points gagnés ;
- le compteur de combo ;
- le multiplicateur.

### `player_state_update`

Utilisé pour afficher le nombre de balles restantes.

## Fichiers concernés

- `frontend/dmd/DmdDisplay.js` : état, événements, rendu et adaptation du texte ;
- `frontend/dmd/index.html` : structure visuelle, couleurs et animations ;
- `tests/frontend/dmd-display.test.js` : tests des différents états du DMD.

## Validation

```bash
node --test tests/frontend/dmd-display.test.js
```
