package main

import (
	"encoding/json"
	"testing"
	"time"
)

func TestGameServiceHandlePing(t *testing.T) {
	hub := newHub()
	service := NewGameService(hub)

	msg := Message{Type: "ping"}
	response, isDirectResponse := service.HandleMessage(msg, []byte(`{"type":"ping"}`))

	if !isDirectResponse {
		t.Fatal("expected ping to return a direct response")
	}

	if response == nil {
		t.Fatal("expected non-nil response for ping")
	}

	var msgResp Message
	if err := json.Unmarshal(response, &msgResp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if msgResp.Type != "pong" {
		t.Fatalf("expected 'pong' type, got %s", msgResp.Type)
	}
}

func TestGameServiceHandleFlipperAction(t *testing.T) {
	hub := newHub()
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	flipperMsg := []byte(`{"type":"flipper_action","payload":{"side":"left"}}`)
	msg := Message{Type: "flipper_action"}
	response, isDirectResponse := service.HandleMessage(msg, flipperMsg)

	if isDirectResponse {
		t.Fatal("expected flipper_action to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for flipper_action")
	}

	// Vérifier que le message est broadcasté
	select {
	case broadcast := <-client.send:
		if string(broadcast) != string(flipperMsg) {
			t.Fatalf("expected broadcast to contain original message, got %s", string(broadcast))
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("expected broadcast message not received")
	}
}

func TestGameServiceHandleGameState(t *testing.T) {
	hub := newHub()
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	stateMsg := []byte(`{"type":"game_state","payload":{"ballX":0.5,"ballY":0.5,"score":100,"gameOver":false}}`)
	msg := Message{Type: "game_state"}
	response, isDirectResponse := service.HandleMessage(msg, stateMsg)

	if isDirectResponse {
		t.Fatal("expected game_state to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for game_state")
	}

	// Vérifier que le message est broadcasté
	select {
	case broadcast := <-client.send:
		if string(broadcast) != string(stateMsg) {
			t.Fatalf("expected broadcast to contain original message")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("expected broadcast message not received")
	}
}

func TestGameServiceHandleUnknownMessageType(t *testing.T) {
	hub := newHub()
	service := NewGameService(hub)

	msg := Message{Type: "unknown_type"}
	response, isDirectResponse := service.HandleMessage(msg, []byte(`{"type":"unknown_type"}`))

	if isDirectResponse {
		t.Fatal("expected unknown type to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for unknown type")
	}
}

func TestGameServiceHandleImpactWithValidScoring(t *testing.T) {
	hub := newHub()
	hub.scorer = newScoreTracker(defaultScoreConfig)
	hub.boss = newBossTracker(defaultBossConfig)
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	impactPayload := ImpactPayload{
		ObjectID:   "bumper-1",
		ObjectType: "bumper",
		Timestamp:  1000,
	}

	payloadBytes, _ := json.Marshal(impactPayload)
	msg := Message{
		Type:    "impact",
		Payload: payloadBytes,
	}

	response, isDirectResponse := service.HandleMessage(msg, []byte{})

	if isDirectResponse {
		t.Fatal("expected impact to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for impact")
	}

	// Vérifier que les messages ont été broadcastés (impact + score_update)
	messages := make([][]byte, 0)
	timeout := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(timeout) && len(messages) < 2 {
		select {
		case broadcast := <-client.send:
			messages = append(messages, broadcast)
		case <-time.After(10 * time.Millisecond):
		}
	}

	if len(messages) < 2 {
		t.Fatalf("expected at least 2 broadcast messages, got %d", len(messages))
	}

	// Vérifier le type du premier message (impact)
	var impactMsg Message
	if err := json.Unmarshal(messages[0], &impactMsg); err != nil {
		t.Fatalf("failed to unmarshal first message: %v", err)
	}

	if impactMsg.Type != "impact" {
		t.Fatalf("expected first message type 'impact', got %s", impactMsg.Type)
	}

	// Vérifier le type du second message (score_update)
	var scoreMsg Message
	if err := json.Unmarshal(messages[1], &scoreMsg); err != nil {
		t.Fatalf("failed to unmarshal second message: %v", err)
	}

	if scoreMsg.Type != "score_update" {
		t.Fatalf("expected second message type 'score_update', got %s", scoreMsg.Type)
	}
}

func TestGameServiceHandleStartGame(t *testing.T) {
	hub := newHub()
	hub.scorer = newScoreTracker(defaultScoreConfig)
	hub.boss = newBossTracker(defaultBossConfig)
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	msg := Message{Type: "start_game"}
	response, isDirectResponse := service.HandleMessage(msg, []byte(`{"type":"start_game"}`))

	if isDirectResponse {
		t.Fatal("expected start_game to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for start_game")
	}

	// Vérifier que 3 messages ont été broadcastés: game_started, score_update (reset), boss_state_update (reset)
	messages := make([][]byte, 0)
	timeout := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(timeout) && len(messages) < 3 {
		select {
		case broadcast := <-client.send:
			messages = append(messages, broadcast)
		case <-time.After(10 * time.Millisecond):
		}
	}

	if len(messages) < 3 {
		t.Fatalf("expected at least 3 broadcast messages, got %d", len(messages))
	}

	// Vérifier les types
	expectedTypes := []string{"game_started", "score_update", "boss_state_update"}
	for i, expected := range expectedTypes {
		var msgResp Message
		if err := json.Unmarshal(messages[i], &msgResp); err != nil {
			t.Fatalf("failed to unmarshal message %d: %v", i, err)
		}

		if msgResp.Type != expected {
			t.Fatalf("message %d: expected type %s, got %s", i, expected, msgResp.Type)
		}
	}
}

func TestGameServiceHandleBossFightStarted(t *testing.T) {
	hub := newHub()
	hub.boss = newBossTracker(defaultBossConfig)
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	msg := Message{Type: "boss_fight_started"}
	response, isDirectResponse := service.HandleMessage(msg, []byte(`{"type":"boss_fight_started"}`))

	if isDirectResponse {
		t.Fatal("expected boss_fight_started to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for boss_fight_started")
	}

	// Vérifier que le message boss_state_update a été broadcasté
	select {
	case broadcast := <-client.send:
		var msgResp Message
		if err := json.Unmarshal(broadcast, &msgResp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if msgResp.Type != "boss_state_update" {
			t.Fatalf("expected 'boss_state_update', got %s", msgResp.Type)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("expected broadcast message not received")
	}
}
