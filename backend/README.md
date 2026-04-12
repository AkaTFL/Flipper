# Backend Flipper - WebSocket Server

Serveur WebSocket en Go pour le jeu de flipper.

## Prérequis

- Go 1.21 ou supérieur

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
| `flipper_action` | Client → Serveur | Action sur les flippers (left/right) |
| `impact` | Client → Serveur | Contact détecté côté frontend (bumper, palle, mur, rampe) |
| `game_state` | Bidirectionnel | État actuel du jeu |


## Structure du projet

```
backend/
├── main.go       # Point d'entrée et serveur WebSocket
├── go.mod        # Dépendances Go
└── go.sum        # Checksums des dépendances
```

## Réaalisé
```
version: 0.1.0
Modestin HOUNGA
```
