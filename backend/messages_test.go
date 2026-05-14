package main

import (
	"encoding/json"
	"testing"
)

func TestNewWelcomeMessage(t *testing.T) {
	msg := NewWelcomeMessage()

	if msg == nil {
		t.Fatal("expected non-nil message")
	}

	var parsed Message
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if parsed.Type != "welcome" {
		t.Fatalf("expected type 'welcome', got %s", parsed.Type)
	}

	if len(parsed.Payload) == 0 {
		t.Fatal("expected non-empty payload")
	}
}

func TestNewPongMessage(t *testing.T) {
	msg := NewPongMessage()

	if msg == nil {
		t.Fatal("expected non-nil message")
	}

	var parsed Message
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if parsed.Type != "pong" {
		t.Fatalf("expected type 'pong', got %s", parsed.Type)
	}
}

func TestNewGameStartedMessage(t *testing.T) {
	msg := NewGameStartedMessage()

	if msg == nil {
		t.Fatal("expected non-nil message")
	}

	var parsed Message
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if parsed.Type != "game_started" {
		t.Fatalf("expected type 'game_started', got %s", parsed.Type)
	}

	var payload map[string]string
	if err := json.Unmarshal(parsed.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	if payload["status"] != "ok" {
		t.Fatalf("expected status 'ok', got %s", payload["status"])
	}
}

func TestNewScoreUpdateMessage(t *testing.T) {
	scoreData := map[string]interface{}{
		"score":        100,
		"basePoints":   50,
		"delta":        50,
		"comboBonus":   0,
		"multiplier":   1,
	}

	msg := NewScoreUpdateMessage(scoreData)

	if msg == nil {
		t.Fatal("expected non-nil message")
	}

	var parsed Message
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if parsed.Type != "score_update" {
		t.Fatalf("expected type 'score_update', got %s", parsed.Type)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(parsed.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	if payload["score"] != float64(100) {
		t.Fatalf("expected score 100, got %v", payload["score"])
	}
}

func TestNewBossStateUpdateMessage(t *testing.T) {
	bossData := map[string]interface{}{
		"health":       100,
		"phase":        1,
		"isActive":     true,
	}

	msg := NewBossStateUpdateMessage(bossData)

	if msg == nil {
		t.Fatal("expected non-nil message")
	}

	var parsed Message
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if parsed.Type != "boss_state_update" {
		t.Fatalf("expected type 'boss_state_update', got %s", parsed.Type)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(parsed.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	if payload["health"] != float64(100) {
		t.Fatalf("expected health 100, got %v", payload["health"])
	}
}

func TestNewImpactMessage(t *testing.T) {
	impactPayload := []byte(`{"objectId":"bumper-1","objectType":"bumper","timestamp":1000}`)

	msg := NewImpactMessage(impactPayload)

	if msg == nil {
		t.Fatal("expected non-nil message")
	}

	var parsed Message
	if err := json.Unmarshal(msg, &parsed); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if parsed.Type != "impact" {
		t.Fatalf("expected type 'impact', got %s", parsed.Type)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(parsed.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal payload: %v", err)
	}

	if payload["objectId"] != "bumper-1" {
		t.Fatalf("expected objectId 'bumper-1', got %v", payload["objectId"])
	}
}

func TestMustMarshalJSONHandlesErrors(t *testing.T) {
	// Une fonction qui retourne une erreur lors du marshaling
	type badType struct {
		Ch chan struct{} // Les channels ne peuvent pas être marshalisés
	}

	result := mustMarshalJSON(badType{Ch: make(chan struct{})})

	// Vérifier que le résultat est un message d'erreur valide
	if len(result) == 0 {
		t.Fatal("expected non-empty error response")
	}

	// Vérifier que c'est du JSON valide
	var errorMsg map[string]interface{}
	if err := json.Unmarshal(result, &errorMsg); err != nil {
		t.Fatalf("expected valid JSON error response, got: %s", string(result))
	}
}

func TestMustMarshalMessagePreservesType(t *testing.T) {
	originalMsg := Message{
		Type:    "test_type",
		Payload: []byte(`{"key":"value"}`),
	}

	marshaled := mustMarshalMessage(originalMsg)

	var restored Message
	if err := json.Unmarshal(marshaled, &restored); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if restored.Type != originalMsg.Type {
		t.Fatalf("expected type %s, got %s", originalMsg.Type, restored.Type)
	}

	if string(restored.Payload) != string(originalMsg.Payload) {
		t.Fatalf("expected payload %s, got %s", string(originalMsg.Payload), string(restored.Payload))
	}
}
