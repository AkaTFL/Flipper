# Règle de score

Ce document décrit la logique de score du flipper à partir du système final partagé pour le projet.

## Formule globale

Tous les scores sont calculés selon la formule suivante :

```text
Score = (Base × Multiplicateur global) + Bonus combo
```

Ordre de priorité gameplay :

1. combo
2. objectifs
3. multiplicateur global

## Valeurs de base par élément

### Bumpers (centraux)

- hit simple : `+50 pts`
- hit en combo : `+75 pts`

### Cibles (targets basses gauche/droite)

- hit simple : `+100 pts`
- hit précis (centre) : `+150 pts`

### Rampes (gauche / droite)

- passage simple : `+500 pts`
- passage parfait (sans rebond) : `+750 pts`

### Zone étoiles (centre bas)

- score variable : `100 → 1000 pts`
- centre exact : `+1000 pts`
- activation complète : `+3000 pts bonus`

### Boucles / rails supérieurs

- passage complet : `+300 pts`
- enchaînement loop repeat : `+300 → 800 pts` avec scaling

## Multiplicateur global

- base : `x1`
- `3 hits` consécutifs : `x2`
- `6 hits` : `x3`
- `10 hits` : `x4` maximum

### Reset du multiplicateur

- perte de balle
- plus de `3 secondes` sans hit

## Système de combo

### Fenêtre de combo

- `2 secondes`

### Bonus combo

| Combo | Bonus |
|-------|-------|
| x2 | `+100 pts` |
| x3 | `+300 pts` |
| x4 | `+700 pts` |
| x5+ | `+1000 pts` |

### Bonus spécial

- `Rampe → Rampe → Rampe` : `+2000 pts` (`Super combo`)

## Objectifs / progression

### Objectif étoiles

- chaque étoile activée : `+200 pts`
- toutes activées :
  - active `Mode Bonus`
  - score `x2` pendant `10 sec`

### Objectif rampes

- `3 passages` sur la même rampe :
  - active `Rampe Boost`
  - valeur de rampe `×2` pendant `15 sec`

### Objectif cibles basses

- toutes les cibles activées :
  - bonus immédiat : `+1500 pts`
  - réinitialisation des cibles

## Bonus dynamiques

### Hot Zone

- zone illuminée :
  - score `×2` sur hit
  - durée : `8 sec`

### Skill Shot

- tir précis au lancement : `+2000 pts`

## État actuel du backend

La logique backend implémente déjà la base suivante :

- bumpers avec distinction simple / combo ;
- cibles avec support d'un hit précis selon `objectId` ;
- rampes avec support d'un passage simple / parfait selon `objectId` ;
- boucles / rails avec scaling progressif ;
- multiplicateur global par paliers ;
- bonus combo par fenêtre de `2 sec` ;
- super combo `rampe → rampe → rampe` ;
- reset du score et de l'état de combo au `start_game`.

Les bonus plus avancés comme `Mode Bonus`, `Rampe Boost`, `Hot Zone` et `Skill Shot` dépendent encore d'événements de gameplay spécifiques à envoyer depuis le frontend.

## Événements spécifiques envoyés par le frontend

Le frontend envoie maintenant des impacts plus précis pour certaines zones du plateau :

- `target-left`
- `target-right`
- `target-left-centre`
- `target-right-centre`
- `star-center`
- `star-center-exact`
- `loop-left`
- `loop-right`
- `ramp-main-simple`
- `ramp-main-perfect`

Ces identifiants permettent au backend d'appliquer un score plus proche du game design final au lieu de se limiter à des collisions génériques.

## Message WebSocket renvoyé

Le backend envoie un message `score_update`.

### Exemple

```json
{
  "type": "score_update",
  "payload": {
    "score": 225,
    "delta": 175,
    "basePoints": 75,
    "comboCount": 2,
    "comboBonus": 100,
    "comboMultiplier": 1,
    "globalMultiplier": 1,
    "superCombo": false,
    "objectId": "bumper-2",
    "objectType": "bumper"
  }
}
```
