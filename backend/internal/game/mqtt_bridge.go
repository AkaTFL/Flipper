package game

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	defaultHTTPPort           = ":8080"
	defaultMQTTHost           = "127.0.0.1"
	defaultMQTTPort           = 1883
	defaultMQTTReconnectDelay = 5 * time.Second
	defaultMQTTClientPrefix   = "flipper-backend"
	defaultSensorTopicFilter  = "flipper/sensor/#"
	defaultDebugTopicFilter   = "flipper/debug/#"
	defaultSolenoidQoS        = byte(1)
	defaultLEDQoS             = byte(0)
	defaultSolenoidDurationMS = 50
	defaultLEDFlashTopic      = "flipper/led/flash"
)

type AppConfig struct {
	HTTPPort string
	MQTT     MQTTConfig
}

type MQTTConfig struct {
	Host           string
	Port           int
	ClientID       string
	Username       string
	Password       string
	ReconnectDelay time.Duration
	SensorFilter   string
	DebugFilter    string
	SolenoidQoS    byte
	LEDQoS         byte
}

type MQTTBridge struct {
	client mqtt.Client
	hub    *Hub
	config MQTTConfig
}

type MQTTEnvelope struct {
	Topic   string          `json:"topic"`
	Payload json.RawMessage `json:"payload"`
}

func loadAppConfig() AppConfig {
	return AppConfig{
		HTTPPort: envOrDefault("HTTP_PORT", defaultHTTPPort),
		MQTT: MQTTConfig{
			Host:           envOrDefault("MQTT_HOST", defaultMQTTHost),
			Port:           envIntOrDefault("MQTT_PORT", defaultMQTTPort),
			ClientID:       envOrDefault("MQTT_CLIENT_ID", fmt.Sprintf("%s-%d", defaultMQTTClientPrefix, time.Now().UnixNano())),
			Username:       os.Getenv("MQTT_USERNAME"),
			Password:       os.Getenv("MQTT_PASSWORD"),
			ReconnectDelay: envDurationOrDefault("MQTT_RECONNECT_SECONDS", defaultMQTTReconnectDelay),
			SensorFilter:   envOrDefault("MQTT_SENSOR_FILTER", defaultSensorTopicFilter),
			DebugFilter:    envOrDefault("MQTT_DEBUG_FILTER", defaultDebugTopicFilter),
			SolenoidQoS:    byte(envIntOrDefault("MQTT_SOLENOID_QOS", int(defaultSolenoidQoS))),
			LEDQoS:         byte(envIntOrDefault("MQTT_LED_QOS", int(defaultLEDQoS))),
		},
	}
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func envIntOrDefault(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("Valeur numérique invalide pour %s=%q, valeur par défaut utilisée: %d", key, value, fallback)
		return fallback
	}

	return parsed
}

func envDurationOrDefault(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	seconds, err := strconv.Atoi(value)
	if err != nil || seconds <= 0 {
		log.Printf("Valeur de durée invalide pour %s=%q, valeur par défaut utilisée: %s", key, value, fallback)
		return fallback
	}

	return time.Duration(seconds) * time.Second
}

func newMQTTBridge(config MQTTConfig, hub *Hub) *MQTTBridge {
	bridge := &MQTTBridge{
		hub:    hub,
		config: config,
	}

	options := mqtt.NewClientOptions().
		AddBroker(config.brokerURL()).
		SetClientID(config.ClientID).
		SetAutoReconnect(true).
		SetConnectRetry(false).
		SetConnectRetryInterval(config.ReconnectDelay).
		SetKeepAlive(30 * time.Second).
		SetPingTimeout(10 * time.Second).
		SetCleanSession(true).
		SetOrderMatters(false)

	if config.Username != "" {
		options.SetUsername(config.Username)
		options.SetPassword(config.Password)
	}

	options.OnConnect = func(client mqtt.Client) {
		log.Printf("MQTT connecté sur %s", config.brokerURL())
		bridge.subscribe(client)
	}

	options.OnConnectionLost = func(_ mqtt.Client, err error) {
		if err != nil {
			log.Printf("Connexion MQTT perdue: %v", err)
		}
	}

	options.DefaultPublishHandler = bridge.handleMessage
	bridge.client = mqtt.NewClient(options)
	return bridge
}

func (c MQTTConfig) brokerURL() string {
	return fmt.Sprintf("tcp://%s:%d", c.Host, c.Port)
}

func (b *MQTTBridge) Start() {
	go b.runConnectionLoop()
}

func (b *MQTTBridge) runConnectionLoop() {
	retryDelay := b.config.ReconnectDelay
	if retryDelay <= 0 {
		retryDelay = defaultMQTTReconnectDelay
	}

	for {
		if b.client != nil && b.client.IsConnectionOpen() {
			time.Sleep(retryDelay)
			continue
		}

		log.Printf("Connexion MQTT vers %s...", b.config.brokerURL())
		token := b.client.Connect()
		if !token.WaitTimeout(5 * time.Second) {
			log.Printf("Connexion MQTT en attente trop longue, nouvel essai dans %s", retryDelay)
			time.Sleep(retryDelay)
			continue
		}

		if err := token.Error(); err != nil {
			log.Printf("Connexion MQTT impossible: %v", err)
			time.Sleep(retryDelay)
			continue
		}

		time.Sleep(retryDelay)
	}
}

func (b *MQTTBridge) subscribe(client mqtt.Client) {
	if client == nil {
		return
	}

	topics := map[string]byte{
		b.config.SensorFilter: b.config.SolenoidQoS,
		b.config.DebugFilter:  b.config.LEDQoS,
	}

	token := client.SubscribeMultiple(topics, b.handleMessage)
	if !token.WaitTimeout(5 * time.Second) {
		log.Printf("Timeout pendant l'abonnement MQTT aux topics backend")
		return
	}

	if err := token.Error(); err != nil {
		log.Printf("Impossible de s'abonner aux topics MQTT: %v", err)
		return
	}

	log.Printf("Abonnements MQTT actifs: %s, %s", b.config.SensorFilter, b.config.DebugFilter)
}

func (b *MQTTBridge) Close() {
	if b.client != nil && b.client.IsConnectionOpen() {
		b.client.Disconnect(250)
	}
}

func (b *MQTTBridge) handleMessage(_ mqtt.Client, message mqtt.Message) {
	wrapped := encodeMQTTEnvelope(message.Topic(), message.Payload())
	messageType := classifyMQTTMessage(message.Topic())
	broadcast := Message{Type: messageType, Payload: wrapped}
	if b.hub != nil {
		b.hub.broadcast <- mustMarshalMessage(broadcast)
	}

	if message.Topic() == "flipper/sensor/tilt/triggered" && b.hub != nil {
		state := GameState{GameOver: true}
		b.hub.broadcast <- mustMarshalMessage(Message{Type: "game_state", Payload: mustMarshalJSON(state)})
	}
}

func classifyMQTTMessage(topic string) string {
	if topic == "flipper/sensor/tilt/warning" {
		return "tilt_warning"
	}

	if topic == "flipper/sensor/tilt/triggered" {
		return "tilt_triggered"
	}

	if strings.HasPrefix(topic, "flipper/debug/") {
		return "mqtt_debug"
	}

	return "mqtt_event"
}

func encodeMQTTEnvelope(topic string, payload []byte) []byte {
	envelope := MQTTEnvelope{
		Topic:   topic,
		Payload: validJSONPayload(payload),
	}

	return mustMarshalJSON(envelope)
}

func validJSONPayload(payload []byte) json.RawMessage {
	if len(payload) == 0 {
		return json.RawMessage("null")
	}

	if json.Valid(payload) {
		return json.RawMessage(payload)
	}

	fallback, err := json.Marshal(string(payload))
	if err != nil {
		return json.RawMessage("null")
	}

	return fallback
}
