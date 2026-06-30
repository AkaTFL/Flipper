# Contrôles clavier et boutons physiques

Ce document est la référence commune pour les contrôles du Flipper, le clavier et l'ESP32.

## Contrôles de jeu

| Contrôle physique ESP32 | Touche | Action |
|---|---|---|
| `black-left` | `Q` | Active le flipper gauche |
| `white-left` | `W` | Active également le flipper gauche |
| `black-right` | `D` | Active le flipper droit |
| `white-right` | `C` | Active également le flipper droit |
| `plunger` | `Espace` | Charge puis lance la bille |

Les deux boutons d'un même côté commandent le même flipper. Ils peuvent être utilisés séparément ou simultanément.

## Contrôles de test

| Contrôle physique ESP32 | Touche | Action de test |
|---|---|---|
| `front-left-yellow` | `B` | Active ou désactive le boss fight |
| `front-left-red` | `H` | Simule une perte de 20 HP |
| `front-left-green` | `L` | Simule une perte de balle |
| `front-white` | `F` | Réservé pour une action future |

Les touches `B`, `H` et `L` sont des commandes de debug. Elles permettent de vérifier le gameplay sans attendre l'événement réel.

## Chaîne de communication

```text
Bouton physique
→ ESP32 (nom du bouton)
→ bridge série
→ endpoint /events
→ CabinetButtons.js (conversion en touche)
→ Controls.js (action du jeu)
```

Le firmware ESP32 envoie le nom du bouton, pas la touche. Le mapping des touches reste donc dans `frontend/flipper/core/CabinetButtons.js`.

## Fichiers à maintenir ensemble

Lors d'un changement de contrôle, vérifier :

- `frontend/flipper/core/CabinetButtons.js` : bouton physique vers touche ;
- `frontend/flipper/core/Controls.js` : interprétation des touches ;
- `frontend/flipper/core/Flipper.js` : configuration utilisée par la partie ;
- `frontend/flipper/index.html` : aide affichée avant le lancement ;
- `tests/frontend/cabinet-buttons.test.js` et `tests/frontend/controls.test.js` ;
- ce document.

Le firmware ne doit être modifié que si le nom du bouton ou son GPIO change.
