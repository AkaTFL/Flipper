package main

import (
	"log"
	"net/http"

	game "flipper-backend/internal/game"
)

func main() {
	config := game.LoadAppConfig()
	hub := game.NewHub()
	mqttBridge := game.NewMQTTBridge(config.MQTT, hub)
	hub.SetMQTTBridge(mqttBridge)
	defer mqttBridge.Close()

	go hub.Run()
	mqttBridge.Start()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		game.ServeWs(hub, w, r)
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
