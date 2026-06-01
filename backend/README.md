# Backend Flipper - WebSocket + MQTT Bridge

Serveur Go pour le jeu de flipper. Il garde le canal WebSocket pour le frontend et relaie aussi des événements vers MQTT pour le matériel IoT.

## Prérequis

- Go 1.21 ou supérieur
- Un broker MQTT Mosquitto accessible sur `MQTT_HOST:MQTT_PORT`

## Installation

```bash
cd backend
go mod download
```

## Lancement

```bash
go run main.go
```

Le serveur démarre sur `http://localhost:8080`

Variables utiles:

- `MQTT_HOST` : hôte du broker, par défaut `127.0.0.1`
- `MQTT_PORT` : port du broker, par défaut `1883`
- `MQTT_CLIENT_ID` : identifiant du client MQTT
- `MQTT_USERNAME` / `MQTT_PASSWORD` : si le broker est protégé

## Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `/ws` | WebSocket | Connexion WebSocket principale |
| `/health` | GET | Vérification de santé du serveur |

## Protocole WebSocket

### Format des messages

```json
{
  "type": "message_type",
  "payload": { ... }
}
```

### Types de messages

| Type | Direction | Description |
|------|-----------|-------------|
| `ping` | Client → Serveur | Vérification de connexion |
| `pong` | Serveur → Client | Réponse au ping |
| `welcome` | Serveur → Client | Message de bienvenue à la connexion |
| `start_game` | Client → Serveur | Démarrer une nouvelle partie |
| `boss_fight_started` | Client → Serveur | Activer explicitement le boss fight |
| `boss_fight_toggled` | Client → Serveur | Basculer le boss fight entre actif et inactif |
| `boss_attack_test` | Client → Serveur | Simuler une attaque moyenne du boss sur le joueur |
| `player_damage_test` | Client → Serveur | Simuler des dégâts joueur pour les tests |
| `ball_lost` | Client → Serveur | Simuler une perte de balle |
| `save_game` | Client → Serveur | Sauvegarder l'état courant dans un slot (1 à 4) |
| `load_game` | Client → Serveur | Recharger l'état d'un slot sauvegardé |
| `game_started` | Serveur → Client | Confirmation du démarrage |
| `score_update` | Serveur → Client | Nouveau score calculé avec delta et combo courant |
| `boss_state_update` | Serveur → Client | État courant du boss (HP, activation, dégâts) |
| `player_state_update` | Serveur → Client | État courant du joueur (HP, balles, game over) |
| `quest_update` | Serveur → Client | État courant des quêtes actives |
| `game_save_status` | Serveur → Client | Confirmation ou erreur liée à un slot de sauvegarde |
| `flipper_action` | Client → Serveur | Action sur les flippers (left/right) |
| `impact` | Client → Serveur | Contact détecté côté frontend (bumper, palle, mur, rampe) |
| `game_state` | Bidirectionnel | État actuel du jeu |

## Pont MQTT

Le backend publie les impacts vers les solénoïdes et relaie les alertes tilt du broker vers le WebSocket.

Topics utilisés:

- `flipper/solenoid/{id}` : commande de solénoïde envoyée quand un impact est reçu côté frontend
- `flipper/led/flash` : impulsion LED au démarrage d'une partie
- `flipper/sensor/tilt/warning` : alerte tilt remontée côté WebSocket
- `flipper/sensor/tilt/triggered` : tilt déclenché, retransmis côté WebSocket et converti en `game_state` avec `gameOver=true`


## Architecture

### Couches logiques

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                      (WebSocket Client)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────┐
            │     WebSocket HTTP Server          │
            │  (main.go + ws_handler.go)         │
            └────────────────┬───────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   Hub (ws_hub.go)│  │ GameService      │
         │  (broadcast,     │  │(game_service.go) │
         │   register,      │  │ Routing métier   │
         │   unregister)    │  └─────┬────────────┘
         └─────────────────┬┘        │
                           │    ┌────┴──────┬──────────┐
                           │    ▼           ▼          ▼
         ┌─────────────────┴────┐  ┌───────────────────┬──┐
         │   Client WriteLoop   │  │ ScoreTracker      │  │
         │   (ws_client.go)     │  │ (score.go)        │  │
         │   Broadcast deliver  │  └───────────────────┘  │
         └──────────────────────┘  ┌──────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
         ┌─────────────────────┐      ┌─────────────────────┐
         │  BossTracker        │      │  MQTTBridge         │
         │  (boss.go)          │      │  (mqtt_bridge.go)   │
         │  Boss HP, phases    │      │  Solenoid, sensor   │
         └─────────────────────┘      └────────┬────────────┘
                                               │
                                    ┌──────────┴───────────┐
                                    ▼                      ▼
                          ┌──────────────────┐  ┌─────────────────┐
                          │ Mosquitto Broker │  │  IoT (ESP32)    │
                          │ (MQTT)           │  │  Sensors, LEDs  │
                          └──────────────────┘  └─────────────────┘
```

### Responsabilités par module

| Module | Responsabilité |
|--------|-----------------|
| `main.go` | Bootstrap serveur HTTP, initialisation du hub et pont MQTT |
| `ws_handler.go` | Upgrade WebSocket, envoi du message de bienvenue |
| `ws_hub.go` | Gestion des clients connectés, broadcasting |
| `ws_client.go` | I/O WebSocket pur: readPump/writePump |
| `game_service.go` | Routing des messages métier (impact, score, boss, etc.) |
| `messages.go` | Helpers de sérialisation JSON et constructeurs de messages typés |
| `types.go` | Types DTO (Message, GameState, ImpactPayload, etc.) |
| `score.go` | Calcul de score, combo, multiplicateurs |
| `boss.go` | Gestion de l'état du boss (HP, phases, dégâts) |
| `player.go` | Gestion de l'état du joueur (HP, balles, game over) |
| `quest.go` | Gestion des quêtes actives, progression et déclenchement boss |
| `mqtt_bridge.go` | Pont vers Mosquitto, publication solénoïdes, souscription capteurs |
| `mqtt_publisher.go` | Utilitaires de publication MQTT |

## Structure du projet

```
backend/
├── main.go                  # Bootstrap + serveur HTTP
├── main_test.go             # Tests d'intégration WebSocket
│
├── ws_handler.go            # Upgrade WebSocket
├── ws_hub.go                # Gestion des clients
├── ws_client.go             # I/O WebSocket
│
├── game_service.go          # Routing métier des messages
├── game_service_test.go     # Tests unitaires du service
│
├── messages.go              # Helpers sérialisation + constructeurs
├── messages_test.go         # Tests des messages
├── types.go                 # Types DTO
│
├── score.go                 # Logique de scoring
├── score_test.go            # Tests unitaires du scoring
│
├── boss.go                  # Gestion boss
├── player.go                # Gestion joueur
├── quest.go                 # Gestion quêtes
│
├── mqtt_bridge.go           # Pont MQTT + config
├── mqtt_bridge_test.go      # Tests du pont MQTT
├── mqtt_publisher.go        # Utilitaires publication
│
├── go.mod                   # Dépendances Go
├── go.sum                   # Checksums
├── README.md                # Cette documentation
└── Dockerfile               # Image Docker
```

## Tests

Tous les tests passent via `go test ./...`:

- **Tests d'intégration WebSocket** (`main_test.go`): inscription/désinscription clients, broadcast
- **Tests unitaires GameService** (`game_service_test.go`): routing des messages, impacts, scoring
- **Tests unitaires Messages** (`messages_test.go`): sérialisation, constructeurs typés
- **Tests unitaires Score** (`score_test.go`): combo, multiplicateurs, resets
- **Tests unitaires Player** (`player_test.go`): HP joueur, perte de balle, game over
- **Tests unitaires MQTT** (`mqtt_bridge_test.go`): classification topics, enveloppe MQTT

## Flux type d'une interaction

1. Frontend détecte un impact (bumper, palle)
2. Envoie `{"type":"impact","payload":{...}}` via WebSocket
3. Client readPump reçoit et crée un Message
4. GameService route vers `handleImpact()`
5. Impact publié via MQTT vers solénoïde
6. Score appliqué (calcul + bonus combo)
7. BroadCast `score_update` vers tous les clients WebSocket
8. Boss damage appliqué si actif
9. Broadcast `boss_state_update` vers tous les clients

Au démarrage d'une partie, le backend réinitialise aussi l'état joueur et diffuse `player_state_update`.
Il tire également `3 quêtes actives` et diffuse `quest_update`.

## Commandes utiles

```bash
# Lancer les tests
go test ./...

# Tests verbose avec couverture
go test -v -cover ./...

# Lancer le serveur en local
go run main.go

# Build Docker
docker build -t flipper-backend .

# Run Docker avec Mosquitto externe
docker run -e MQTT_HOST=host.docker.internal -p 8080:8080 flipper-backend
```

## Version

```
version: 0.1.0
Refactoring étapes 1-4 complétées
Modestin HOUNGA
```
