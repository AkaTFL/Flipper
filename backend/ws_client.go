package main

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
				if bossUpdate, ok := hub.boss.ApplyScoreDamage(scoreUpdate.Delta); ok {
					hub.broadcast <- mustMarshalMessage(Message{
						Type:    "boss_state_update",
						Payload: mustMarshalJSON(bossUpdate),
					})
				}
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
			hub.broadcast <- mustMarshalMessage(Message{
				Type:    "boss_state_update",
				Payload: mustMarshalJSON(hub.boss.ResetForGameStart()),
			})

		case "boss_fight_started":
			log.Println("Boss fight activé")
			hub.broadcast <- mustMarshalMessage(Message{
				Type:    "boss_state_update",
				Payload: mustMarshalJSON(hub.boss.StartBossFight()),
			})

		case "boss_fight_toggled":
			log.Println("Boss fight toggle")
			hub.broadcast <- mustMarshalMessage(Message{
				Type:    "boss_state_update",
				Payload: mustMarshalJSON(hub.boss.ToggleBossFight()),
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
