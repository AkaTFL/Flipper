package game

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

func TestGameServiceBroadcastsButtonEvent(t *testing.T) {
	hub := newHub()
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client
	service := NewGameService(hub)
	buttonMessage := []byte(`{"type":"button_event","payload":{"name":"button_white_left","key":"x","active":true}}`)

	service.HandleMessage(Message{Type: "button_event"}, buttonMessage)

	select {
	case broadcast := <-client.send:
		if string(broadcast) != string(buttonMessage) {
			t.Fatalf("expected button event broadcast, got %s", string(broadcast))
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("expected button event broadcast")
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
	hub.player = newPlayerTracker(defaultPlayerConfig)
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

	// Vérifier que 5 messages ont été broadcastés: game_started, score_update, boss_state_update, player_state_update, quest_update
	messages := make([][]byte, 0)
	timeout := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(timeout) && len(messages) < 5 {
		select {
		case broadcast := <-client.send:
			messages = append(messages, broadcast)
		case <-time.After(10 * time.Millisecond):
		}
	}

	if len(messages) < 5 {
		t.Fatalf("expected at least 5 broadcast messages, got %d", len(messages))
	}

	// Vérifier les types
	expectedTypes := []string{"game_started", "score_update", "boss_state_update", "player_state_update", "quest_update"}
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

func TestGameServiceHandlePlayerDamageTest(t *testing.T) {
	hub := newHub()
	hub.player = newPlayerTracker(defaultPlayerConfig)
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	msg := Message{Type: "boss_attack_test"}
	response, isDirectResponse := service.HandleMessage(msg, []byte(`{"type":"boss_attack_test"}`))

	if isDirectResponse {
		t.Fatal("expected boss_attack_test to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for boss_attack_test")
	}

	select {
	case broadcast := <-client.send:
		var msgResp Message
		if err := json.Unmarshal(broadcast, &msgResp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if msgResp.Type != "player_state_update" {
			t.Fatalf("expected 'player_state_update', got %s", msgResp.Type)
		}

		var payload PlayerStateUpdatePayload
		if err := json.Unmarshal(msgResp.Payload, &payload); err != nil {
			t.Fatalf("failed to unmarshal player payload: %v", err)
		}

		if payload.HP != 80 || payload.LastDamageTaken != 20 || payload.Balls != 3 {
			t.Fatalf("unexpected player damage payload: %+v", payload)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("expected broadcast message not received")
	}
}

func TestGameServiceResetsSurvivalQuestWhenBossDamageLosesBall(t *testing.T) {
	hub := newHub()
	hub.player = newPlayerTracker(PlayerConfig{MaxHP: 20, MaxBalls: 3})
	hub.quests.activeQuests = []Quest{
		{ID: "survive_20s", Category: "exploration", Label: "Survivre 20 secondes avec la même bille", Target: 20, Progress: 8},
	}
	hub.quests.phaseStartedAt = time.Now().Add(-8 * time.Second).UnixMilli()
	go hub.run()

	client := &Client{send: make(chan []byte, 256)}
	hub.register <- client

	service := NewGameService(hub)

	msg := Message{Type: "boss_attack_test"}
	response, isDirectResponse := service.HandleMessage(msg, []byte(`{"type":"boss_attack_test"}`))

	if isDirectResponse {
		t.Fatal("expected boss_attack_test to not return a direct response")
	}

	if response != nil {
		t.Fatal("expected nil response for boss_attack_test")
	}

	messages := make([]Message, 0)
	timeout := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(timeout) && len(messages) < 2 {
		select {
		case broadcast := <-client.send:
			var msgResp Message
			if err := json.Unmarshal(broadcast, &msgResp); err != nil {
				t.Fatalf("failed to unmarshal broadcast: %v", err)
			}
			messages = append(messages, msgResp)
		case <-time.After(10 * time.Millisecond):
		}
	}

	if len(messages) < 2 {
		t.Fatalf("expected player_state_update and quest_update, got %d messages", len(messages))
	}

	if messages[0].Type != "player_state_update" {
		t.Fatalf("expected first message player_state_update, got %s", messages[0].Type)
	}

	var playerPayload PlayerStateUpdatePayload
	if err := json.Unmarshal(messages[0].Payload, &playerPayload); err != nil {
		t.Fatalf("failed to unmarshal player payload: %v", err)
	}

	if !playerPayload.LastBallLost || playerPayload.Balls != 2 {
		t.Fatalf("expected ball lost after boss damage, got %+v", playerPayload)
	}

	if messages[1].Type != "quest_update" {
		t.Fatalf("expected second message quest_update, got %s", messages[1].Type)
	}

	var questPayload QuestUpdatePayload
	if err := json.Unmarshal(messages[1].Payload, &questPayload); err != nil {
		t.Fatalf("failed to unmarshal quest payload: %v", err)
	}

	if len(questPayload.ActiveQuests) != 1 || questPayload.ActiveQuests[0].Progress != 0 {
		t.Fatalf("expected survival quest reset, got %+v", questPayload)
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
