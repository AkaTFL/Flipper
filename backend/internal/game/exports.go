package game

import (
	"net/http"
)

func LoadAppConfig() AppConfig {
	return loadAppConfig()
}

func NewHub() *Hub {
	return newHub()
}

func NewHubWithSaveStore(saveStore *GameSaveStore) *Hub {
	return newHubWithSaveStore(saveStore)
}

func NewGameSaveStore(path string) *GameSaveStore {
	return newGameSaveStore(path)
}

func NewMQTTBridge(config MQTTConfig, hub *Hub) *MQTTBridge {
	return newMQTTBridge(config, hub)
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	serveWs(hub, w, r)
}

func (h *Hub) SetMQTTBridge(mqttBridge *MQTTBridge) {
	h.mqtt = mqttBridge
}

func (h *Hub) Run() {
	h.run()
}