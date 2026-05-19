# Écran DMD et score

## Contexte

Cette documentation décrit le travail réalisé pour l'issue `#128 - Ajout écran DMD et score`.

Le DMD correspond à la petite zone d'affichage située au milieu du backbox du flipper. Dans la machine physique, cette zone sert à afficher les informations essentielles pendant la partie, sans surcharger le joueur.

L'objectif de cette étape est donc de créer un affichage simple, lisible et connecté aux événements du jeu.

## Objectifs de l'écran DMD

Le DMD doit afficher peu d'informations à la fois, car le joueur doit rester concentré sur la bille.

Les objectifs principaux sont :

- afficher le score total ;
- afficher la série de points en cours ;
- afficher le multiplicateur actuel ;
- afficher les balles restantes ;
- afficher les quêtes actives ;
- afficher l'état du boss fight quand le boss est actif.

## Fonctionnement général

Avant l'apparition du boss, le DMD alterne entre deux écrans :

1. un écran de résumé ;
2. un écran de quêtes.

Quand le boss apparaît, l'alternance s'arrête et le DMD reste sur l'écran de combat.

## Écran 1 : résumé avant le boss

```text
SCORE  12 500
SÉRIE  +600            MULT x2
BALLES 3/3
```

Cet écran donne l'état général de la partie.

### SCORE

Le `SCORE` correspond au score total du joueur depuis le début de la partie.

### SÉRIE

La ligne `SÉRIE` affiche les points accumulés pendant la séquence de combo en cours.

Exemple :

```text
SÉRIE +1 800
```

Cela signifie que le joueur a gagné `1 800` points dans la séquence actuelle.

La série se remet à zéro quand le combo est cassé. Le DMD utilise un timer court pour remettre cette valeur à `0` si le joueur ne continue pas la séquence.

### MULT

Le `MULT` affiche le multiplicateur actuel du combo.

Il est volontairement affiché séparément de la valeur de la série pour éviter une confusion. Par exemple :

```text
SÉRIE +60 000          MULT x4
```

Cela ne veut pas dire que `60 000` sera encore multiplié par `4`. Le multiplicateur a déjà été pris en compte dans les points reçus.

Le texte est aligné avec un espacement fixe afin que `MULT` ne bouge pas quand la valeur de la série augmente ou diminue.

### BALLES

La ligne `BALLES` affiche le nombre de balles restantes :

```text
BALLES 3/3
```

## Écran 2 : quêtes avant le boss

```text
QUÊTES 1/3
✓ Points 2000/2000
- Rampe parfaite 0/1
- Survivre 20s 8/20s
```

Cet écran affiche les trois quêtes actives.

La première ligne affiche la progression globale :

```text
QUÊTES 1/3
```

Ensuite, chaque quête est affichée sur une ligne.

- `✓` indique une quête terminée ;
- `-` indique une quête encore active.

Les intitulés des quêtes sont volontairement raccourcis pour rester lisibles sur le DMD.

Exemples :

- `Atteindre 2 000 points` devient `Points` ;
- `Réussir 1 rampe parfaite` devient `Rampe parfaite` ;
- `Toucher 5 bumpers au total` devient `5 bumpers` ;
- `Survivre 20 secondes avec la même bille` devient `Survivre 20s`.

## Quête de survie

La quête `Survivre 20s` demande au joueur de garder la même bille en jeu pendant 20 secondes.

Elle est affichée comme ceci :

```text
- Survivre 20s 8/20s
```

Le compteur indique les secondes déjà validées.

### Correction réalisée

Avant la correction, cette quête ne progressait que lorsqu'un impact était reçu. Si la bille restait en jeu sans toucher de nouvel objet, le compteur n'avançait pas correctement.

La logique a été corrigée en deux parties :

- côté backend, un timer met à jour la quête chaque seconde pendant la partie ;
- côté frontend, le DMD possède aussi une petite sécurité locale pour continuer à afficher les secondes entre deux messages backend.

Quand le compteur atteint `20/20s`, la quête est affichée comme terminée :

```text
✓ Survivre 20s 20/20s
```

Si un message backend arrive ensuite avec un ancien progrès plus bas, le DMD ne revient pas en arrière.

### Réinitialisation après perte de balle

La quête de survie doit être liée à la même bille.

Donc, quand le joueur perd une balle, la progression est remise à zéro :

```text
- Survivre 20s 0/20s
```

Cela fonctionne aussi quand le joueur perd tout son HP, car cela déclenche une perte de balle côté backend.

## Écran boss fight

Quand le boss apparaît, le DMD arrête d'alterner entre les écrans.

Il affiche uniquement les informations importantes pour le combat :

```text
SCORE  18 400
BOSS   750/1000
JOUEUR 80/100
BALLES 2/3
```

Pendant le boss fight, les quêtes ne sont plus affichées, car elles ont servi à débloquer le boss.

## Messages WebSocket utilisés

Le DMD utilise les messages déjà envoyés par le backend.

### `score_update`

Utilisé pour :

- le score total ;
- la valeur gagnée sur le dernier impact ;
- le compteur de combo ;
- le multiplicateur actuel.

### `quest_update`

Utilisé pour :

- les quêtes actives ;
- la progression de chaque quête ;
- le nombre de quêtes terminées ;
- la validation de la quête de survie.

### `boss_state_update`

Utilisé pour :

- savoir si le boss est actif ;
- afficher les PV du boss ;
- arrêter l'alternance des écrans quand le boss fight commence.

### `player_state_update`

Utilisé pour :

- afficher les HP du joueur ;
- afficher les balles restantes ;
- réinitialiser la quête de survie quand une balle est perdue ;
- afficher l'état game over.

## Fichiers concernés

### Frontend

- `frontend/flipper/ui/DmdDisplay.js`
  - création de l'affichage DMD ;
  - alternance entre écran résumé et écran quêtes ;
  - affichage de l'écran boss fight ;
  - gestion locale de la série de combo ;
  - gestion locale du compteur de survie.

- `frontend/flipper/core/Flipper.js`
  - ajout du montage du DMD dans la scène frontend.

### Backend

- `backend/quest.go`
  - ajout de la mise à jour de la quête de survie par le temps ;
  - ajout de la réinitialisation de la quête de survie après perte de balle.

- `backend/ws_hub.go`
  - ajout d'un timer pour envoyer les mises à jour de quêtes liées au temps.

- `backend/game_service.go`
  - démarrage du timer de quête au lancement d'une partie ;
  - réinitialisation de la quête de survie lors d'une perte de balle.

### Tests

- `tests/frontend/dmd-display.test.js`
  - tests du DMD ;
  - tests de la série de combo ;
  - tests de l'affichage des quêtes ;
  - tests de la quête de survie côté frontend.

- `backend/quest_test.go`
  - tests de progression de la quête de survie ;
  - tests de validation à 20 secondes ;
  - tests de réinitialisation après perte de balle.

## État actuel

À ce stade :

- le DMD s'affiche dans le frontend ;
- l'écran résumé fonctionne ;
- l'écran quêtes fonctionne ;
- l'écran boss fight fonctionne ;
- la série de combo se remet à zéro quand la séquence est cassée ;
- le multiplicateur reste lisible et aligné ;
- la quête `Survivre 20s` compte correctement les secondes ;
- la quête de survie se valide à `20/20s` ;
- la quête de survie se réinitialise quand une balle est perdue.

## Validation

Les vérifications utilisées sont :

```bash
npm test
npm run test:backend
npm run lint
```

Ces commandes permettent de vérifier :

- les tests frontend ;
- les tests backend ;
- la qualité simple du code via le lint.
