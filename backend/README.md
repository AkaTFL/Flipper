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
| `game_started` | Serveur → Client | Confirmation du démarrage |
| `score_update` | Serveur → Client | Nouveau score calculé avec delta et combo courant |
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


## Structure du projet

```
backend/
├── main.go       # Point d'entrée et serveur WebSocket
├── mqtt_bridge.go # Pont MQTT + configuration
├── go.mod        # Dépendances Go
└── go.sum        # Checksums des dépendances
```

## Réaalisé
```
version: 0.1.0
Modestin HOUNGA
```
