package game

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestWebSocketSaveAndLoadGameSlot(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect websocket client: %v", err)
	}
	defer conn.Close()
	_ = readMessageType(t, conn)

	if err := conn.WriteJSON(Message{Type: "start_game"}); err != nil {
		t.Fatalf("failed to send start_game: %v", err)
	}

	_ = readMessageType(t, conn)
	_ = readMessageType(t, conn)
	_ = readMessageType(t, conn)
	_ = readMessageType(t, conn)
	_ = readMessageType(t, conn)

	if err := conn.WriteJSON(Message{
		Type:    "impact",
		Payload: json.RawMessage(`{"objectId":"bumper-1","objectType":"bumper","timestamp":1000}`),
	}); err != nil {
		t.Fatalf("failed to seed score state: %v", err)
	}

	_ = readMessageType(t, conn)
	scoreBeforeSave := readMessageType(t, conn)
	if scoreBeforeSave.Type != "score_update" {
		t.Fatalf("expected score_update before save, got %s", scoreBeforeSave.Type)
	}

	if err := conn.WriteJSON(Message{
		Type:    "save_game",
		Payload: json.RawMessage(`{"slot":1}`),
	}); err != nil {
		t.Fatalf("failed to send save_game: %v", err)
	}

	saveStatus := readMessageTypeMatching(t, conn, func(msg Message) bool {
		return msg.Type == "game_save_status"
	})
	if saveStatus.Type != "game_save_status" {
		t.Fatalf("expected game_save_status after save, got %s", saveStatus.Type)
	}

	if err := conn.WriteJSON(Message{
		Type:    "impact",
		Payload: json.RawMessage(`{"objectId":"bumper-2","objectType":"bumper","timestamp":2000}`),
	}); err != nil {
		t.Fatalf("failed to mutate score state: %v", err)
	}

	_ = readMessageType(t, conn)
	mutatedScore := readMessageType(t, conn)
	if mutatedScore.Type != "score_update" {
		t.Fatalf("expected score_update after mutation, got %s", mutatedScore.Type)
	}

	if err := conn.WriteJSON(Message{
		Type:    "load_game",
		Payload: json.RawMessage(`{"slot":1}`),
	}); err != nil {
		t.Fatalf("failed to send load_game: %v", err)
	}

	restoredScoreMsg := readMessageTypeMatching(t, conn, func(msg Message) bool {
		return msg.Type == "score_update"
	})
	if restoredScoreMsg.Type != "score_update" {
		t.Fatalf("expected score_update first on load, got %s", restoredScoreMsg.Type)
	}

	var restoredScore ScoreUpdatePayload
	if err := json.Unmarshal(restoredScoreMsg.Payload, &restoredScore); err != nil {
		t.Fatalf("failed to unmarshal restored score payload: %v", err)
	}

	if restoredScore.Score != 25 {
		t.Fatalf("expected restored score to be 25, got %d", restoredScore.Score)
	}

	_ = readMessageTypeMatching(t, conn, func(msg Message) bool { return msg.Type == "boss_state_update" })
	_ = readMessageTypeMatching(t, conn, func(msg Message) bool { return msg.Type == "player_state_update" })
	_ = readMessageTypeMatching(t, conn, func(msg Message) bool { return msg.Type == "quest_update" })

	loadedStatus := readMessageTypeMatching(t, conn, func(msg Message) bool {
		return msg.Type == "game_save_status"
	})
	if loadedStatus.Type != "game_save_status" {
		t.Fatalf("expected game_save_status after load, got %s", loadedStatus.Type)
	}
}

func readMessageTypeMatching(t *testing.T, conn *websocket.Conn, match func(Message) bool) Message {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		msg := readMessageType(t, conn)
		if match(msg) {
			return msg
		}
	}

	t.Fatal("timed out while waiting for websocket message")
	return Message{}
}
