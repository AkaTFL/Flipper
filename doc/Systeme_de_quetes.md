# Système de quêtes

Ce document définit une première version du système de quêtes utilisé pendant la `session classique` de chaque phase.

L'objectif est de :

- éviter des quêtes toujours identiques ;
- garder un gameplay varié d'une partie à l'autre ;
- préparer l'apparition du boss sans bloquer le joueur avec des combinaisons incohérentes.

## Principe général

Chaque phase possède un `pool de 9 quêtes`.

Ces 9 quêtes sont réparties en `3 catégories` :

1. `Score / progression`
2. `Précision / maîtrise`
3. `Exploration / survie`

Au début d'une phase :

- le jeu tire `1 quête par catégorie`
- les `3 quêtes tirées` deviennent les `quêtes actives`
- le boss apparaît quand les `3 quêtes actives` sont terminées

Cette approche permet :

- de garder un effet aléatoire ;
- d'éviter 3 quêtes trop similaires dans la même partie ;
- de faciliter l'équilibrage.

## Catégorie 1 : Score / progression

Ces quêtes poussent le joueur à faire progresser son score global.

### Quête 1.1

- `id` : `score_2000`
- `label` : `Atteindre 2 000 points`
- `condition` : le score total atteint ou dépasse `2000`

### Quête 1.2

- `id` : `score_3500`
- `label` : `Atteindre 3 500 points`
- `condition` : le score total atteint ou dépasse `3500`

### Quête 1.3

- `id` : `combo_x3`
- `label` : `Atteindre un combo x3`
- `condition` : le joueur déclenche un combo de niveau `x3` ou plus

## Catégorie 2 : Précision / maîtrise

Ces quêtes demandent au joueur de viser ou d'exécuter une action plus technique.

### Quête 2.1

- `id` : `target_center_2`
- `label` : `Toucher 2 fois la zone centrale d'une cible basse`
- `condition` : toucher `2 fois` une zone de type `target-*-centre`

#### Précision

Ici, le `centre du cible` correspond à la `petite zone centrale` d'une cible basse gauche ou droite.

Techniquement, cela correspond aux événements déjà prévus :

- `target-left-centre`
- `target-right-centre`

### Quête 2.2

- `id` : `ramp_perfect_1`
- `label` : `Réussir 1 rampe parfaite`
- `condition` : déclencher `1` événement `ramp-main-perfect`

#### Précision

Une `rampe parfaite` correspond à un passage de rampe `sans rebond sur un mur` pendant la traversée.

Dans l'implémentation actuelle :

- entrée dans la zone d'entrée de rampe ;
- traversée propre ;
- sortie dans la zone de sortie ;
- aucun contact mur détecté entre les deux.

### Quête 2.3

- `id` : `ramp_simple_2`
- `label` : `Réussir 2 passages de rampe`
- `condition` : déclencher `2` événements `ramp-main-simple` ou `ramp-main-perfect`

## Catégorie 3 : Exploration / survie

Ces quêtes encouragent le déplacement de la balle dans différentes zones du plateau ou la survie pendant un temps donné.

### Quête 3.1

- `id` : `loop_left_right`
- `label` : `Passer une fois par chaque loop latéral`
- `condition` :
  - déclencher `1` événement `loop-left`
  - déclencher `1` événement `loop-right`

### Quête 3.2

- `id` : `bumpers_5`
- `label` : `Toucher 5 bumpers au total`
- `condition` : toucher `5 fois` n'importe quel bumper, sans imposer lequel

### Quête 3.3

- `id` : `survive_20s`
- `label` : `Survivre 20 secondes avec la même bille`
- `condition` : garder la même bille en jeu pendant `20 secondes`

## Pool initial proposé

Le premier pool de travail contient donc `9 quêtes` :

1. `score_2000`
2. `score_3500`
3. `combo_x3`
4. `target_center_2`
5. `ramp_perfect_1`
6. `ramp_simple_2`
7. `loop_left_right`
8. `bumpers_5`
9. `survive_20s`

## Tirage aléatoire recommandé

Le tirage recommandé est :

- `1 quête` dans la catégorie `Score / progression`
- `1 quête` dans la catégorie `Précision / maîtrise`
- `1 quête` dans la catégorie `Exploration / survie`

### Exemple de tirage A

- `score_2000`
- `ramp_perfect_1`
- `loop_left_right`

### Exemple de tirage B

- `combo_x3`
- `ramp_simple_2`
- `survive_20s`

## Structure technique recommandée

Chaque quête peut être représentée par une structure proche de :

```json
{
  "id": "ramp_perfect_1",
  "category": "precision",
  "label": "Réussir 1 rampe parfaite",
  "type": "counter",
  "target": 1,
  "progress": 0,
  "completed": false
}
```

## Suivi de progression

Le backend ou le gameplay manager devra pouvoir :

- initialiser les `3 quêtes actives` au début d'une phase ;
- écouter les événements de gameplay ;
- incrémenter la progression des quêtes concernées ;
- marquer une quête comme `completed` ;
- déclencher le boss quand les `3 quêtes actives` sont terminées.

## Événements déjà disponibles

Les éléments suivants existent déjà ou sont en bonne voie pour alimenter ce système :

- score total
- combo
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
- impacts `bumper`

## Ce qu'il faudra encore ajouter

## État actuel d'intégration

Une première version backend du système de quêtes est maintenant en place.

Le backend :

- possède un `QuestTracker` ;
- utilise le pool initial de `9 quêtes` décrit dans ce document ;
- tire `3 quêtes actives` au `start_game` ;
- choisit `1 quête` par catégorie :
  - `Score / progression`
  - `Précision / maîtrise`
  - `Exploration / survie`
- envoie un message WebSocket `quest_update` ;
- suit la progression des quêtes à partir des impacts et du score ;
- déclenche automatiquement le boss fight quand les `3 quêtes actives` sont terminées.

Le frontend affiche aussi les quêtes actives dans le HUD de test.

### Message `quest_update`

Exemple :

```json
{
  "type": "quest_update",
  "payload": {
    "activeQuests": [
      {
        "id": "score_2000",
        "category": "score",
        "label": "Atteindre 2 000 points",
        "target": 2000,
        "progress": 500,
        "completed": false
      }
    ],
    "completedCount": 0,
    "requiredCount": 3,
    "allCompleted": false,
    "bossFightTriggered": false,
    "mode": "quest_progress"
  }
}
```

### Règle actuelle

Les quêtes progressent uniquement tant que le boss fight n'est pas actif.

Quand les `3 quêtes` sont terminées :

1. le backend envoie un dernier `quest_update` avec `bossFightTriggered: true` ;
2. le backend active le boss ;
3. le backend envoie un `boss_state_update`.

## Ce qu'il faudra encore améliorer

Pour finaliser le système de quêtes, il faudra ensuite :

1. améliorer l'affichage visuel des quêtes ;
2. équilibrer les valeurs après des tests jouables ;
3. relier les quêtes à la progression réelle des phases ;
4. remplacer les éléments temporaires de test par les vrais événements gameplay ;
5. gérer proprement le passage phase suivante / boss suivant.
