package main

import (
	"encoding/json"
	"log"
)

// Helpers pour sérialisation des messages et payloads

// mustMarshalJSON sérialise une valeur en JSON, ou retourne un message d'erreur
func mustMarshalJSON(value any) []byte {
	encoded, err := json.Marshal(value)
	if err != nil {
		log.Printf("Erreur de sérialisation JSON: %v", err)
		return []byte(`{"error":"serialization failed"}`)
	}
	return encoded
}

// mustMarshalMessage sérialise un Message complet en JSON
func mustMarshalMessage(message Message) []byte {
	return mustMarshalJSON(message)
}

// Constructeurs typés pour les messages courants (maintiennent l'homogénéité)

// NewWelcomeMessage crée le message de bienvenue à l'arrivée d'un client
func NewWelcomeMessage() []byte {
	return mustMarshalMessage(Message{
		Type:    "welcome",
		Payload: mustMarshalJSON(map[string]string{"message": "Bienvenue sur Flipper WebSocket!"}),
	})
}

// NewPongMessage crée la réponse pong à un ping
func NewPongMessage() []byte {
	return mustMarshalMessage(Message{Type: "pong"})
}

// NewGameStartedMessage crée le message de confirmation de démarrage du jeu
func NewGameStartedMessage() []byte {
	return mustMarshalMessage(Message{
		Type:    "game_started",
		Payload: mustMarshalJSON(map[string]string{"status": "ok"}),
	})
}

// NewScoreUpdateMessage crée le message de mise à jour du score
func NewScoreUpdateMessage(scoreUpdate any) []byte {
	return mustMarshalMessage(Message{
		Type:    "score_update",
		Payload: mustMarshalJSON(scoreUpdate),
	})
}

// NewBossStateUpdateMessage crée le message de mise à jour de l'état du boss
func NewBossStateUpdateMessage(bossUpdate any) []byte {
	return mustMarshalMessage(Message{
		Type:    "boss_state_update",
		Payload: mustMarshalJSON(bossUpdate),
	})
}

// NewPlayerStateUpdateMessage crée le message de mise à jour de l'état du joueur
func NewPlayerStateUpdateMessage(playerUpdate any) []byte {
	return mustMarshalMessage(Message{
		Type:    "player_state_update",
		Payload: mustMarshalJSON(playerUpdate),
	})
}

// NewImpactMessage crée le message d'impact
func NewImpactMessage(payload json.RawMessage) []byte {
	return mustMarshalMessage(Message{
		Type:    "impact",
		Payload: payload,
	})
}

// NewGameStateMessage crée le message d'état de jeu (utilisé pour broadcast brut)
func NewGameStateMessage(messageBytes []byte) []byte {
	return messageBytes
}
