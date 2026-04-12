package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Message représente un message échangé via WebSocket
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// GameState représente l'état du jeu de flipper
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

// Client représente une connexion WebSocket
type Client struct {
	conn *websocket.Conn
	send chan []byte
}

// Hub gère toutes les connexions clients
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Autoriser toutes les origines pour le développement
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
			if _, ok := h.clients[client]; ok {
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
		c.conn.Close()
	}()

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Erreur: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Erreur parsing message: %v", err)
			continue
		}

		// Traitement des différents types de messages
		switch msg.Type {
		case "ping":
			response, _ := json.Marshal(Message{Type: "pong"})
			c.send <- response

		case "flipper_action":
			// Action de flipper (left/right paddle)
			log.Printf("Action flipper reçue: %s", string(msg.Payload))
			// Broadcast à tous les clients
			hub.broadcast <- messageBytes

		case "impact":
			var impact ImpactPayload
			if err := json.Unmarshal(msg.Payload, &impact); err != nil {
				log.Printf("Erreur parsing impact: %v", err)
				continue
			}

			log.Printf("Impact reçu sur %s (%s)", impact.ObjectID, impact.ObjectType)
			hub.broadcast <- messageBytes

		case "game_state":
			// Mise à jour de l'état du jeu
			hub.broadcast <- messageBytes

		case "start_game":
			log.Println("Nouvelle partie démarrée")
			response, _ := json.Marshal(Message{
				Type:    "game_started",
				Payload: json.RawMessage(`{"status": "ok"}`),
			})
			hub.broadcast <- response

		default:
			log.Printf("Type de message inconnu: %s", msg.Type)
		}
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()

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

	// Envoyer un message de bienvenue
	welcome, _ := json.Marshal(Message{
		Type:    "welcome",
		Payload: json.RawMessage(`{"message": "Bienvenue sur Flipper WebSocket!"}`),
	})
	client.send <- welcome

	go client.writePump()
	go client.readPump(hub)
}

func main() {
	hub := newHub()
	go hub.run()

	// Route WebSocket
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// Route de santé
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	port := ":8080"
	log.Printf("Serveur WebSocket démarré sur http://localhost%s", port)
	log.Printf("Endpoint WebSocket: ws://localhost%s/ws", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("Erreur démarrage serveur:", err)
	}
}
