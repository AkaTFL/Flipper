package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type GameState struct {
	BallX    float64 `json:"ballX"`
	BallY    float64 `json:"ballY"`
	BallVelX float64 `json:"ballVelX"`
	BallVelY float64 `json:"ballVelY"`
	Score    int     `json:"score"`
	GameOver bool    `json:"gameOver"`
}

type ImpactPayload struct {
	ObjectID   string `json:"objectId"`
	ObjectType string `json:"objectType"`
	Timestamp  int64  `json:"timestamp"`
}

type Client struct {
	conn *websocket.Conn
	send chan []byte
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mqtt       *MQTTBridge
	scorer     *ScoreTracker
	mutex      sync.RWMutex
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		scorer:     newScoreTracker(defaultScoreConfig),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Client connecté. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, exists := h.clients[client]; exists {
				delete(h.clients, client)
				close(client.send)
			}
			h.mutex.Unlock()
			log.Printf("Client déconnecté. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		_ = c.conn.Close()
	}()

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Erreur WebSocket: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Message WebSocket invalide: %v", err)
			continue
		}

		switch msg.Type {
		case "ping":
			response, _ := json.Marshal(Message{Type: "pong"})
			c.send <- response

		case "flipper_action":
			log.Printf("Action flipper reçue: %s", string(msg.Payload))
			hub.broadcast <- messageBytes

		case "impact":
			var impact ImpactPayload
			if err := json.Unmarshal(msg.Payload, &impact); err != nil {
				log.Printf("Erreur parsing impact: %v", err)
				continue
			}

			log.Printf("Impact reçu sur %s (%s)", impact.ObjectID, impact.ObjectType)
			if hub.mqtt != nil {
				hub.mqtt.PublishImpact(impact)
			}
			hub.broadcast <- messageBytes
			if scoreUpdate, ok := hub.scorer.ApplyImpact(impact); ok {
				hub.broadcast <- mustMarshalMessage(Message{
					Type:    "score_update",
					Payload: mustMarshalJSON(scoreUpdate),
				})
			}

		case "game_state":
			hub.broadcast <- messageBytes

		case "start_game":
			log.Println("Nouvelle partie démarrée")
			if hub.mqtt != nil {
				hub.mqtt.PublishLEDFlash()
			}
			response, _ := json.Marshal(Message{
				Type:    "game_started",
				Payload: json.RawMessage(`{"status":"ok"}`),
			})
			hub.broadcast <- response
			hub.broadcast <- mustMarshalMessage(Message{
				Type:    "score_update",
				Payload: mustMarshalJSON(hub.scorer.Reset()),
			})

		default:
			log.Printf("Type de message inconnu: %s", msg.Type)
		}
	}
}

func (c *Client) writePump() {
	defer func() {
		_ = c.conn.Close()
	}()

	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Erreur upgrade WebSocket: %v", err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
	}
	hub.register <- client

	welcome, _ := json.Marshal(Message{
		Type:    "welcome",
		Payload: json.RawMessage(`{"message":"Bienvenue sur Flipper WebSocket!"}`),
	})
	client.send <- welcome

	go client.writePump()
	go client.readPump(hub)
}

func main() {
	config := loadAppConfig()
	hub := newHub()
	mqttBridge := newMQTTBridge(config.MQTT, hub)
	hub.mqtt = mqttBridge
	defer mqttBridge.Close()

	go hub.run()
	mqttBridge.Start()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	log.Printf("Serveur WebSocket démarré sur http://localhost%s", config.HTTPPort)
	log.Printf("Endpoint WebSocket: ws://localhost%s/ws", config.HTTPPort)
	log.Printf("MQTT: %s:%d", config.MQTT.Host, config.MQTT.Port)

	if err := http.ListenAndServe(config.HTTPPort, nil); err != nil {
		log.Fatal("Erreur démarrage serveur:", err)
	}
}
