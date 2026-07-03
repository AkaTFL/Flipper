package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

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

	http.HandleFunc("/saves", func(w http.ResponseWriter, r *http.Request) {
		handleSavesHTTP(hub, w, r)
	})

	log.Printf("Serveur WebSocket démarré sur http://localhost%s", config.HTTPPort)
	log.Printf("Endpoint WebSocket: ws://localhost%s/ws", config.HTTPPort)
	log.Printf("MQTT: %s:%d", config.MQTT.Host, config.MQTT.Port)

	if err := http.ListenAndServe(config.HTTPPort, nil); err != nil {
		log.Fatal("Erreur démarrage serveur:", err)
	}
}

// handleSavesHTTP expose la liste et la suppression des sauvegardes pour l'écran de sélection.
// GET /saves              -> liste des 4 slots
// DELETE /saves?slot=N    -> supprime le slot N puis renvoie la liste à jour
func handleSavesHTTP(hub *game.Hub, w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

	switch r.Method {
	case http.MethodOptions:
		w.WriteHeader(http.StatusNoContent)

	case http.MethodGet:
		writeJSON(w, http.StatusOK, hub.SaveStore().List())

	case http.MethodDelete:
		slot, err := strconv.Atoi(r.URL.Query().Get("slot"))
		if err != nil || slot < 1 || slot > game.MaxSaveSlots {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "slot invalide"})
			return
		}

		if err := hub.SaveStore().Delete(slot); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, hub.SaveStore().List())

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
