# Systeme de boss fight et player state

Ce document definit la premiere version du systeme de boss fight, de l'etat joueur et du systeme de vies / balles pour l'issue `#118`.

L'objectif est de poser une base simple, testable et equilibrable avant d'ajouter des attaques de boss plus complexes ou une integration complete avec les quetes.

## Objectifs de gameplay

Le systeme doit permettre de :

- suivre les PV du boss ;
- suivre les PV du joueur ;
- gerer les balles / vies restantes ;
- convertir le score gagne en degats infliges au boss ;
- appliquer des degats du boss au joueur ;
- detecter la perte d'une balle ;
- detecter le game over ;
- preparer l'integration future avec les quetes aleatoires.

## Valeurs de base recommandees

### Boss

- PV maximum du boss : `1500 HP`
- Le boss commence inactif au debut d'une partie.
- Le boss devient actif quand le boss fight est declenche.
- Pour les tests actuels, le boss peut etre active manuellement.
- Plus tard, le boss devra etre active automatiquement quand les `3 quetes actives` seront terminees.

### Joueur

- PV maximum du joueur : `100 HP`
- Nombre de balles / vies initiales : `3`
- Quand les PV du joueur atteignent `0`, le joueur perd `1 balle`.
- Apres une perte de balle, les PV du joueur reviennent a `100 HP` si au moins une balle reste disponible.
- Si le joueur n'a plus de balle disponible, la partie passe en `game over`.

## Conversion score vers degats boss

Le score reste la source principale des degats infliges au boss pendant le boss fight.

Regle actuelle :

```text
Degats boss = Delta de score x coefficient de degats
```

Valeur recommandee pour le MVP :

```text
coefficient de degats = 0.05
```

Exemples :

| Action | Delta de score | Degats boss |
|--------|----------------|-------------|
| Bumper simple | `+25 pts` | `1 degat` |
| Cible simple | `+50 pts` | `2 degats` |
| Rampe simple | `+200 pts` | `10 degats` |
| Rampe parfaite | `+350 pts` | `17 degats` |
| Super combo rampe | `+700 pts` bonus | `35 degats` bonus |

Cette regle permet de recompenser directement les actions fortes du joueur : plus le joueur marque de points pendant le boss fight, plus il inflige de degats.

## Degats du boss vers le joueur

Pour la premiere implementation, les degats du boss doivent rester simples et faciles a tester.

Valeurs recommandees :

| Type d'attaque | Degats joueur | Usage |
|----------------|---------------|-------|
| Attaque faible | `10 HP` | attaque rapide ou erreur legere |
| Attaque moyenne | `20 HP` | valeur de test principale |
| Attaque forte | `35 HP` | attaque plus dangereuse |

Pour le MVP technique, on peut commencer avec une seule valeur :

```text
boss_attack = 20 degats joueur
```

Avec `100 HP`, le joueur peut donc encaisser `5 attaques moyennes` avant de perdre une balle.

Avec `3 balles`, le joueur peut encaisser environ `15 attaques moyennes` au total avant le game over.

## Boucle de boss fight cible

La boucle visee est :

1. Le joueur commence une partie.
2. Le score, le boss et le player state sont reinitialises.
3. Le joueur termine les quetes de la phase.
4. Le boss fight est declenche.
5. Les impacts du joueur generent du score.
6. Le score genere des degats sur le boss.
7. Le boss peut infliger des degats au joueur.
8. Si les PV du joueur atteignent `0`, une balle est consommee.
9. Si aucune balle ne reste, la partie passe en `game over`.
10. Si les PV du boss atteignent `0`, le boss est vaincu.

## Etats attendus

### Etat du boss

Message deja existant :

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

### Etat du joueur

Message a ajouter :

```json
{
  "type": "player_state_update",
  "payload": {
    "hp": 100,
    "maxHp": 100,
    "balls": 3,
    "maxBalls": 3,
    "lastDamageTaken": 0,
    "lastBallLost": false,
    "gameOver": false,
    "mode": "game_started"
  }
}
```

## Evenements techniques temporaires

Comme les attaques reelles du boss ne sont pas encore implementees, des evenements temporaires peuvent etre ajoutes pour tester le systeme.

Evenements possibles :

- `player_damage_test` : applique des degats fixes au joueur ;
- `boss_attack_test` : simule une attaque moyenne du boss ;
- `ball_lost` : force la perte d'une balle ;
- `start_game` : reinitialise le score, le boss et le player state.

Ces evenements servent uniquement a valider la logique tant que la partie 3D et les attaques du boss ne sont pas finalisees.

## Touches de test frontend

Pendant le developpement, le frontend expose des touches simples pour tester la logique sans attendre les vraies attaques du boss :

| Touche | Action |
|--------|--------|
| `B` | active / desactive le boss fight |
| `H` | simule une attaque du boss et retire `20 HP` au joueur |
| `L` | simule une perte de balle |

Sur le meuble physique, ces touches sont envoyees par les boutons suivants :

| Bouton ESP32 | Touche | Simulation |
|---|---|---|
| `front-left-yellow` | `B` | boss fight |
| `front-left-red` | `H` | perte de HP |
| `front-left-green` | `L` | perte de balle |

Le mapping complet est centralise dans [`Controles_playfield.md`](Controles_playfield.md).

Ces touches sont temporaires et servent uniquement au debug gameplay.

## Equilibrage initial

Le premier equilibrage recommande est :

```text
Boss HP: 1500
Player HP: 100
Balles / vies: 3
Degats boss vers joueur: 20
Degats joueur vers boss: score_delta x 0.05
```

Ce reglage donne une base lisible :

- le joueur doit produire du score pour vaincre le boss ;
- les grosses actions de score deviennent importantes pendant le boss fight ;
- le joueur peut faire plusieurs erreurs avant le game over ;
- la difficulte pourra etre ajustee apres les premiers tests jouables.

## Points a ajuster plus tard

Apres integration et tests, il faudra probablement ajuster :

- les PV du boss selon la duree moyenne d'une phase ;
- le coefficient de degats `0.05` si le boss tombe trop vite ou trop lentement ;
- les degats du boss selon la frequence des attaques ;
- le nombre de balles si le jeu devient trop facile ou trop punitif ;
- les recompenses apres chaque boss de phase.
