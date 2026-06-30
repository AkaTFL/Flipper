package main

import (
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestGameSaveStoreListReflectsSlots(t *testing.T) {
	store := newGameSaveStore(filepath.Join(t.TempDir(), "saves.json"))

	if _, err := store.Save(2, 3, GameSnapshot{Score: ScoreStateSnapshot{Score: 1250}}); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	infos := store.List()
	if len(infos) != maxSaveSlots {
		t.Fatalf("expected %d slots, got %d", maxSaveSlots, len(infos))
	}

	if infos[0].Occupied {
		t.Fatalf("expected slot 1 empty, got %+v", infos[0])
	}

	slot2 := infos[1]
	if !slot2.Occupied || slot2.Slot != 2 || slot2.Level != 3 || slot2.Score != 1250 || slot2.SavedAt == 0 {
		t.Fatalf("unexpected slot 2 info: %+v", slot2)
	}
}

func TestGameSaveStoreDeleteClearsSlotAndPersists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "saves.json")
	store := newGameSaveStore(path)

	if _, err := store.Save(1, 2, GameSnapshot{Score: ScoreStateSnapshot{Score: 500}}); err != nil {
		t.Fatalf("save failed: %v", err)
	}

	if err := store.Delete(1); err != nil {
		t.Fatalf("delete failed: %v", err)
	}

	if _, found := store.Load(1); found {
		t.Fatal("expected slot 1 to be empty after delete")
	}

	// La suppression doit être persistée : un nouveau store relit le fichier
	reloaded := newGameSaveStore(path)
	if _, found := reloaded.Load(1); found {
		t.Fatal("expected deletion to be persisted to disk")
	}
}

func TestGameSaveStoreDeleteRejectsInvalidSlot(t *testing.T) {
	store := newGameSaveStore(filepath.Join(t.TempDir(), "saves.json"))

	if err := store.Delete(0); err == nil {
		t.Fatal("expected error for slot 0")
	}
	if err := store.Delete(maxSaveSlots + 1); err == nil {
		t.Fatal("expected error for out-of-range slot")
	}
}

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
