package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func waitUntil(t *testing.T, condition func() bool) {
	t.Helper()

	deadline := time.Now().Add(500 * time.Millisecond)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatal("timed out while waiting for async hub state")
}

func TestNewHubInitialState(t *testing.T) {
	hub := newHub()

	if hub == nil {
		t.Fatal("expected hub to be initialized")
	}

	if hub.clients == nil {
		t.Fatal("expected clients map to be initialized")
	}

	if hub.broadcast == nil || hub.register == nil || hub.unregister == nil {
		t.Fatal("expected hub channels to be initialized")
	}

	if len(hub.clients) != 0 {
		t.Fatalf("expected no connected clients, got %d", len(hub.clients))
	}
}

func TestHubRegisterAndUnregisterFlow(t *testing.T) {
	hub := newHub()
	client := &Client{send: make(chan []byte, 1)}

	go hub.run()

	hub.register <- client

	waitUntil(t, func() bool {
		hub.mutex.RLock()
		defer hub.mutex.RUnlock()
		_, exists := hub.clients[client]
		return exists
	})

	hub.unregister <- client

	waitUntil(t, func() bool {
		hub.mutex.RLock()
		defer hub.mutex.RUnlock()
		_, exists := hub.clients[client]
		return !exists
	})
}

func TestHubBroadcastsMessagesToRegisteredClients(t *testing.T) {
	hub := newHub()
	client := &Client{send: make(chan []byte, 1)}

	go hub.run()

	hub.register <- client
	waitUntil(t, func() bool {
		hub.mutex.RLock()
		defer hub.mutex.RUnlock()
		_, exists := hub.clients[client]
		return exists
	})

	expected := []byte(`{"type":"ping"}`)
	hub.broadcast <- expected

	select {
	case message := <-client.send:
		if string(message) != string(expected) {
			t.Fatalf("expected %s, got %s", expected, message)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("expected broadcast message to be delivered")
	}
}

func newTestServer(t *testing.T) (*Hub, *httptest.Server, string) {
	t.Helper()

	hub := newHub()
	go hub.run()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	server := httptest.NewServer(mux)
	wsURL := "ws" + server.URL[len("http"):] + "/ws"

	return hub, server, wsURL
}

func readMessageType(t *testing.T, conn *websocket.Conn) Message {
	t.Helper()

	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, payload, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("failed to read websocket message: %v", err)
	}

	var msg Message
	if err := json.Unmarshal(payload, &msg); err != nil {
		t.Fatalf("failed to unmarshal websocket message: %v", err)
	}

	return msg
}

func TestHealthEndpointReturnsOK(t *testing.T) {
	_, server, _ := newTestServer(t)
	defer server.Close()

	response, err := http.Get(server.URL + "/health")
	if err != nil {
		t.Fatalf("failed to call health endpoint: %v", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	if contentType := response.Header.Get("Content-Type"); contentType != "application/json" {
		t.Fatalf("expected application/json content type, got %s", contentType)
	}
}

func TestWebSocketConnectionReceivesWelcomeAndPong(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect to websocket server: %v", err)
	}
	defer conn.Close()

	welcome := readMessageType(t, conn)
	if welcome.Type != "welcome" {
		t.Fatalf("expected welcome message, got %s", welcome.Type)
	}

	if err := conn.WriteJSON(Message{Type: "ping"}); err != nil {
		t.Fatalf("failed to send ping message: %v", err)
	}

	pong := readMessageType(t, conn)
	if pong.Type != "pong" {
		t.Fatalf("expected pong message, got %s", pong.Type)
	}
}

func TestWebSocketBroadcastsFlipperActionsToOtherClients(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	firstConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect first websocket client: %v", err)
	}
	defer firstConn.Close()
	_ = readMessageType(t, firstConn)

	secondConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect second websocket client: %v", err)
	}
	defer secondConn.Close()
	_ = readMessageType(t, secondConn)

	if err := firstConn.WriteJSON(Message{
		Type:    "flipper_action",
		Payload: json.RawMessage(`{"side":"left","active":true}`),
	}); err != nil {
		t.Fatalf("failed to send flipper action: %v", err)
	}

	broadcast := readMessageType(t, secondConn)
	if broadcast.Type != "flipper_action" {
		t.Fatalf("expected flipper_action broadcast, got %s", broadcast.Type)
	}
}

func TestWebSocketBroadcastsImpactEventsToOtherClients(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	firstConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect first websocket client: %v", err)
	}
	defer firstConn.Close()
	_ = readMessageType(t, firstConn)

	secondConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect second websocket client: %v", err)
	}
	defer secondConn.Close()
	_ = readMessageType(t, secondConn)

	if err := firstConn.WriteJSON(Message{
		Type:    "impact",
		Payload: json.RawMessage(`{"objectId":"bumper-1","objectType":"bumper","timestamp":123456}`),
	}); err != nil {
		t.Fatalf("failed to send impact event: %v", err)
	}

	broadcast := readMessageType(t, secondConn)
	if broadcast.Type != "impact" {
		t.Fatalf("expected impact broadcast, got %s", broadcast.Type)
	}

	var payload ImpactPayload
	if err := json.Unmarshal(broadcast.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal impact payload: %v", err)
	}

	if payload.ObjectID != "bumper-1" {
		t.Fatalf("expected objectId bumper-1, got %s", payload.ObjectID)
	}
}

func TestWebSocketBroadcastsScoreUpdateAfterImpact(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	firstConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect first websocket client: %v", err)
	}
	defer firstConn.Close()
	_ = readMessageType(t, firstConn)

	secondConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect second websocket client: %v", err)
	}
	defer secondConn.Close()
	_ = readMessageType(t, secondConn)

	if err := firstConn.WriteJSON(Message{
		Type:    "impact",
		Payload: json.RawMessage(`{"objectId":"bumper-1","objectType":"bumper","timestamp":1000}`),
	}); err != nil {
		t.Fatalf("failed to send impact event: %v", err)
	}

	broadcast := readMessageType(t, secondConn)
	if broadcast.Type != "impact" {
		t.Fatalf("expected impact broadcast first, got %s", broadcast.Type)
	}

	scoreUpdate := readMessageType(t, secondConn)
	if scoreUpdate.Type != "score_update" {
		t.Fatalf("expected score_update broadcast second, got %s", scoreUpdate.Type)
	}

	var payload ScoreUpdatePayload
	if err := json.Unmarshal(scoreUpdate.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal score update payload: %v", err)
	}

	if payload.Score != 50 || payload.Delta != 50 {
		t.Fatalf("expected score update to report 50 points, got score=%d delta=%d", payload.Score, payload.Delta)
	}
	if payload.ComboCount != 1 || payload.ComboMultiplier != 1 {
		t.Fatalf("expected first hit combo to be x1, got combo=%d multiplier=%d", payload.ComboCount, payload.ComboMultiplier)
	}
}

func TestWebSocketStartGameResetsScoreState(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect websocket client: %v", err)
	}
	defer conn.Close()
	_ = readMessageType(t, conn)

	if err := conn.WriteJSON(Message{
		Type:    "impact",
		Payload: json.RawMessage(`{"objectId":"bumper-1","objectType":"bumper","timestamp":1000}`),
	}); err != nil {
		t.Fatalf("failed to seed score state: %v", err)
	}

	_ = readMessageType(t, conn)
	_ = readMessageType(t, conn)

	if err := conn.WriteJSON(Message{Type: "start_game"}); err != nil {
		t.Fatalf("failed to send start_game: %v", err)
	}

	gameStarted := readMessageType(t, conn)
	if gameStarted.Type != "game_started" {
		t.Fatalf("expected game_started message, got %s", gameStarted.Type)
	}

	scoreUpdate := readMessageType(t, conn)
	if scoreUpdate.Type != "score_update" {
		t.Fatalf("expected score_update reset message, got %s", scoreUpdate.Type)
	}

	var payload ScoreUpdatePayload
	if err := json.Unmarshal(scoreUpdate.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal reset score payload: %v", err)
	}

	if payload.Score != 0 || payload.ComboCount != 0 || payload.Delta != 0 {
		t.Fatalf("expected reset score payload, got %+v", payload)
	}

	bossUpdate := readMessageType(t, conn)
	if bossUpdate.Type != "boss_state_update" {
		t.Fatalf("expected boss_state_update after reset, got %s", bossUpdate.Type)
	}

	var bossPayload BossStateUpdatePayload
	if err := json.Unmarshal(bossUpdate.Payload, &bossPayload); err != nil {
		t.Fatalf("failed to unmarshal boss payload: %v", err)
	}

	if bossPayload.Active || bossPayload.HP != defaultBossMaxHP || bossPayload.DamageTaken != 0 {
		t.Fatalf("expected inactive reset boss payload, got %+v", bossPayload)
	}
}

func TestWebSocketBroadcastsBossStateUpdateAfterImpactWhileBossIsActive(t *testing.T) {
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

	_ = readMessageType(t, conn) // game_started
	_ = readMessageType(t, conn) // score_update reset
	_ = readMessageType(t, conn) // boss_state_update reset

	if err := conn.WriteJSON(Message{Type: "boss_fight_started"}); err != nil {
		t.Fatalf("failed to send boss_fight_started: %v", err)
	}

	_ = readMessageType(t, conn) // boss_state_update activation

	if err := conn.WriteJSON(Message{
		Type:    "impact",
		Payload: json.RawMessage(`{"objectId":"bumper-1","objectType":"bumper","timestamp":1000}`),
	}); err != nil {
		t.Fatalf("failed to send impact event: %v", err)
	}

	_ = readMessageType(t, conn) // impact
	_ = readMessageType(t, conn) // score_update
	bossUpdate := readMessageType(t, conn)
	if bossUpdate.Type != "boss_state_update" {
		t.Fatalf("expected boss_state_update broadcast, got %s", bossUpdate.Type)
	}

	var payload BossStateUpdatePayload
	if err := json.Unmarshal(bossUpdate.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal boss state payload: %v", err)
	}

	if payload.HP != 995 || payload.DamageTaken != 5 || !payload.Active {
		t.Fatalf("expected 5 damage on active boss, got %+v", payload)
	}
}

func TestWebSocketBossFightStartedActivatesBossExplicitly(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect websocket client: %v", err)
	}
	defer conn.Close()
	_ = readMessageType(t, conn)

	if err := conn.WriteJSON(Message{Type: "boss_fight_started"}); err != nil {
		t.Fatalf("failed to send boss_fight_started: %v", err)
	}

	bossUpdate := readMessageType(t, conn)
	if bossUpdate.Type != "boss_state_update" {
		t.Fatalf("expected boss_state_update after boss_fight_started, got %s", bossUpdate.Type)
	}

	var payload BossStateUpdatePayload
	if err := json.Unmarshal(bossUpdate.Payload, &payload); err != nil {
		t.Fatalf("failed to unmarshal boss payload: %v", err)
	}

	if !payload.Active || payload.HP != defaultBossMaxHP || payload.Mode != "boss_fight_started" {
		t.Fatalf("unexpected boss activation payload: %+v", payload)
	}
}

func TestWebSocketBossFightToggledAlternatesBossState(t *testing.T) {
	_, server, wsURL := newTestServer(t)
	defer server.Close()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("failed to connect websocket client: %v", err)
	}
	defer conn.Close()
	_ = readMessageType(t, conn)

	if err := conn.WriteJSON(Message{Type: "boss_fight_toggled"}); err != nil {
		t.Fatalf("failed to send boss_fight_toggled: %v", err)
	}

	firstUpdate := readMessageType(t, conn)
	if firstUpdate.Type != "boss_state_update" {
		t.Fatalf("expected boss_state_update after first toggle, got %s", firstUpdate.Type)
	}

	var firstPayload BossStateUpdatePayload
	if err := json.Unmarshal(firstUpdate.Payload, &firstPayload); err != nil {
		t.Fatalf("failed to unmarshal first boss payload: %v", err)
	}

	if !firstPayload.Active || firstPayload.Mode != "boss_fight_activated" {
		t.Fatalf("expected active boss after first toggle, got %+v", firstPayload)
	}

	if err := conn.WriteJSON(Message{Type: "boss_fight_toggled"}); err != nil {
		t.Fatalf("failed to send second boss_fight_toggled: %v", err)
	}

	secondUpdate := readMessageType(t, conn)
	if secondUpdate.Type != "boss_state_update" {
		t.Fatalf("expected boss_state_update after second toggle, got %s", secondUpdate.Type)
	}

	var secondPayload BossStateUpdatePayload
	if err := json.Unmarshal(secondUpdate.Payload, &secondPayload); err != nil {
		t.Fatalf("failed to unmarshal second boss payload: %v", err)
	}

	if secondPayload.Active || secondPayload.Mode != "boss_fight_deactivated" {
		t.Fatalf("expected inactive boss after second toggle, got %+v", secondPayload)
	}
}
