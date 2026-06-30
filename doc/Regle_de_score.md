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

- hit simple : `+25 pts`
- hit en combo : `+40 pts`

### Cibles (targets basses gauche/droite)

- hit simple : `+50 pts`
- hit précis (centre) : `+75 pts`

### Rampes (gauche / droite)

- passage simple : `+200 pts`
- passage parfait (sans rebond) : `+350 pts`

### Zone étoiles (centre bas)

- score variable : `50 → 400 pts`
- centre exact : `+400 pts`
- activation complète : `+1200 pts bonus`

### Boucles / rails supérieurs

- passage complet : `+120 pts`
- enchaînement loop repeat : `+120 → 350 pts` avec scaling

### Éléments sans score

- murs / bordures : `0 pt`
- sol / ground : `0 pt`
- balle : `0 pt`
- palles : `0 pt`

Ces éléments peuvent générer des collisions physiques, mais ils ne doivent pas augmenter le score.

## Multiplicateur global

- base : `x1`
- `6 hits` consécutifs : `x2`
- `12 hits` : `x3`
- `18 hits` : `x4` maximum

### Reset du multiplicateur

- perte de balle
- plus de `3 secondes` sans hit

## Système de combo

### Fenêtre de combo

- `2 secondes`

### Bonus combo

| Combo | Bonus |
|-------|-------|
| x2 | `+50 pts` |
| x3 | `+120 pts` |
| x4 | `+250 pts` |
| x5+ | `+400 pts` |

### Bonus spécial

- `Rampe → Rampe → Rampe` : `+700 pts` (`Super combo`)

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
  - bonus immédiat : `+750 pts`
  - réinitialisation des cibles

## Bonus dynamiques

### Hot Zone

- zone illuminée :
  - score `×2` sur hit
  - durée : `8 sec`

### Skill Shot

- tir précis au lancement : `+800 pts`

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

## Score et dégâts du boss

Le score sert maintenant aussi de base de dégâts pendant le boss fight.

### Règle actuelle

```text
Dégâts boss = Delta de score × coefficient
```

### Valeur temporaire utilisée

- coefficient actuel : `0.05`
- exemple :
  - `+25 pts` => `1 dégât boss`
  - `+350 pts` => `17 dégâts boss`

### État actuel d'intégration

- le backend maintient un état minimal du boss ;
- le boss possède `1500 HP` maximum ;
- un message `boss_state_update` est renvoyé au frontend ;
- au `start_game`, le boss est réinitialisé mais reste `inactif` ;
- pour les tests, le boss peut être activé ou désactivé manuellement.

### Important

Le flux de test actuel sert à valider la boucle suivante :

1. `start_game`
2. boss `inactif`
3. activation manuelle du boss
4. `score_update`
5. conversion en dégâts
6. `boss_state_update`

Quand les `3 quêtes` seront implémentées, l'activation manuelle devra être remplacée par un déclenchement explicite du boss fight à la fin des quêtes.

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

Le backend envoie maintenant :

- `score_update`
- `boss_state_update`

Pendant les tests, le frontend peut aussi envoyer :

- `boss_fight_started`
- `boss_fight_toggled`

### Exemple

```json
{
  "type": "score_update",
  "payload": {
    "score": 115,
    "delta": 90,
    "basePoints": 40,
    "comboCount": 2,
    "comboBonus": 50,
    "comboMultiplier": 1,
    "globalMultiplier": 1,
    "superCombo": false,
    "objectId": "bumper-2",
    "objectType": "bumper"
  }
}
```

### Exemple `boss_state_update`

```json
{
  "type": "boss_state_update",
  "payload": {
    "active": true,
    "hp": 1483,
    "maxHp": 1500,
    "damageTaken": 17,
    "coefficient": 0.05,
    "defeated": false,
    "mode": "score_damage"
  }
}
```
