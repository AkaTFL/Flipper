package game

import (
	"encoding/json"
	"log"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn *websocket.Conn
	send chan []byte
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		_ = c.conn.Close()
	}()

	service := NewGameService(hub)

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

		// Traiter le message via le service
		if response, isDirectResponse := service.HandleMessage(msg, messageBytes); isDirectResponse && response != nil {
			c.send <- response
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
