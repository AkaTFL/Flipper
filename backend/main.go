package main

import (
	"log"
	"net/http"
)

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
