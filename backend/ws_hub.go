package main

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mqtt       *MQTTBridge
	scorer     *ScoreTracker
	boss       *BossTracker
	player     *PlayerTracker
	quests     *QuestTracker
	mutex      sync.RWMutex
	timerMutex sync.Mutex
	timerStop  chan struct{}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *Hub) startQuestTimer() {
	h.timerMutex.Lock()
	if h.timerStop != nil {
		close(h.timerStop)
	}

	stop := make(chan struct{})
	h.timerStop = stop
	h.timerMutex.Unlock()

	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-stop:
				return
			case now := <-ticker.C:
				if h.boss.IsActive() {
					return
				}

				questUpdate, ok := h.quests.UpdateAfterTime(now.UnixMilli())
				if !ok {
					continue
				}

				h.broadcast <- NewQuestUpdateMessage(questUpdate)
				if questUpdate.BossFightTriggered {
					h.broadcast <- NewBossStateUpdateMessage(h.boss.StartBossFight())
					return
				}
			}
		}
	}()
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		scorer:     newScoreTracker(defaultScoreConfig),
		boss:       newBossTracker(defaultBossConfig),
		player:     newPlayerTracker(defaultPlayerConfig),
		quests:     newQuestTracker(),
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
