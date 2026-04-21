package main

import (
	"encoding/json"
	"log"
)

// GameService encapsule la logique métier des messages WebSocket
type GameService struct {
	hub *Hub
}

// NewGameService crée une nouvelle instance du service de jeu
func NewGameService(hub *Hub) *GameService {
	return &GameService{hub: hub}
}

// HandleMessage route et traite les messages WebSocket selon leur type
// Retourne une réponse optionnelle à envoyer au client et un booléen indiquant si c'est une réponse directe
func (gs *GameService) HandleMessage(msg Message, messageBytes []byte) ([]byte, bool) {
	switch msg.Type {
	case "ping":
		return gs.handlePing(), true

	case "flipper_action":
		gs.handleFlipperAction(messageBytes)
		return nil, false

	case "impact":
		gs.handleImpact(msg.Payload)
		return nil, false

	case "game_state":
		gs.handleGameState(messageBytes)
		return nil, false

	case "start_game":
		gs.handleStartGame()
		return nil, false

	case "boss_fight_started":
		gs.handleBossFightStarted()
		return nil, false

	case "boss_fight_toggled":
		gs.handleBossFightToggled()
		return nil, false

	default:
		log.Printf("Type de message inconnu: %s", msg.Type)
		return nil, false
	}
}

// handlePing traite les messages ping et retourne la réponse pong
func (gs *GameService) handlePing() []byte {
	response, _ := json.Marshal(Message{Type: "pong"})
	return response
}

// handleFlipperAction traite les actions flipper (broadcast uniquement)
func (gs *GameService) handleFlipperAction(messageBytes []byte) {
	log.Printf("Action flipper reçue: %s", string(messageBytes))
	gs.hub.broadcast <- messageBytes
}

// handleImpact traite les impacts (scoring, MQTT, boss damage)
func (gs *GameService) handleImpact(payload json.RawMessage) {
	var impact ImpactPayload
	if err := json.Unmarshal(payload, &impact); err != nil {
		log.Printf("Erreur parsing impact: %v", err)
		return
	}

	log.Printf("Impact reçu sur %s (%s)", impact.ObjectID, impact.ObjectType)

	// Publier impact via MQTT
	if gs.hub.mqtt != nil {
		gs.hub.mqtt.PublishImpact(impact)
	}

	// Broadcaster l'impact brut
	originalMsg, _ := json.Marshal(Message{
		Type:    "impact",
		Payload: payload,
	})
	gs.hub.broadcast <- originalMsg

	// Appliquer le calcul de score
	if scoreUpdate, ok := gs.hub.scorer.ApplyImpact(impact); ok {
		gs.hub.broadcast <- mustMarshalMessage(Message{
			Type:    "score_update",
			Payload: mustMarshalJSON(scoreUpdate),
		})

		// Appliquer les dégâts au boss
		if bossUpdate, ok := gs.hub.boss.ApplyScoreDamage(scoreUpdate.Delta); ok {
			gs.hub.broadcast <- mustMarshalMessage(Message{
				Type:    "boss_state_update",
				Payload: mustMarshalJSON(bossUpdate),
			})
		}
	}
}

// handleGameState traite les mises à jour d'état de jeu (broadcast uniquement)
func (gs *GameService) handleGameState(messageBytes []byte) {
	gs.hub.broadcast <- messageBytes
}

// handleStartGame traite le démarrage du jeu (reset des scores et boss)
func (gs *GameService) handleStartGame() {
	log.Println("Nouvelle partie démarrée")

	// Publier signal LED
	if gs.hub.mqtt != nil {
		gs.hub.mqtt.PublishLEDFlash()
	}

	// Broadcaster la confirmation de démarrage
	response, _ := json.Marshal(Message{
		Type:    "game_started",
		Payload: json.RawMessage(`{"status":"ok"}`),
	})
	gs.hub.broadcast <- response

	// Broadcaster reset score
	gs.hub.broadcast <- mustMarshalMessage(Message{
		Type:    "score_update",
		Payload: mustMarshalJSON(gs.hub.scorer.Reset()),
	})

	// Broadcaster reset boss
	gs.hub.broadcast <- mustMarshalMessage(Message{
		Type:    "boss_state_update",
		Payload: mustMarshalJSON(gs.hub.boss.ResetForGameStart()),
	})
}

// handleBossFightStarted traite l'activation du combat de boss
func (gs *GameService) handleBossFightStarted() {
	log.Println("Boss fight activé")
	gs.hub.broadcast <- mustMarshalMessage(Message{
		Type:    "boss_state_update",
		Payload: mustMarshalJSON(gs.hub.boss.StartBossFight()),
	})
}

// handleBossFightToggled traite le toggle du combat de boss
func (gs *GameService) handleBossFightToggled() {
	log.Println("Boss fight toggle")
	gs.hub.broadcast <- mustMarshalMessage(Message{
		Type:    "boss_state_update",
		Payload: mustMarshalJSON(gs.hub.boss.ToggleBossFight()),
	})
}
