package main

import (
	"fmt"
	"log"
	"strings"
	"time"
)

var impactToSolenoidTopic = map[string]string{
	"bumper-1":    "back_center",
	"bumper-2":    "back_right",
	"palle-left":  "flipper_left",
	"palle-right": "flipper_right",
}

type SolenoidCommand struct {
	Action     string `json:"action"`
	DurationMS int    `json:"duration_ms"`
	Source     string `json:"source,omitempty"`
	ObjectID   string `json:"objectId,omitempty"`
	ObjectType string `json:"objectType,omitempty"`
	Timestamp  int64  `json:"timestamp,omitempty"`
}

func (b *MQTTBridge) PublishImpact(impact ImpactPayload) bool {
	topicID, ok := b.topicForImpact(impact)

	// Beaucoup d'impacts (murs, sol, cibles non instrumentées) n'ont volontairement
	// aucun solénoïde: on sort sans log pour éviter d'inonder la sortie en jeu.
	if !ok {
		return false
	}

	payload := SolenoidCommand{
		Action:     "activate",
		DurationMS: defaultSolenoidDurationMS,
		Source:     "impact",
		ObjectID:   impact.ObjectID,
		ObjectType: impact.ObjectType,
		Timestamp:  time.Now().UnixMilli(),
	}

	return b.publishJSON(fmt.Sprintf("flipper/solenoid/%s", topicID), b.config.SolenoidQoS, payload)
}

func (b *MQTTBridge) topicForImpact(impact ImpactPayload) (string, bool) {
	if topicID, ok := impactToSolenoidTopic[impact.ObjectID]; ok {
		return topicID, true
	}

	switch strings.ToLower(strings.TrimSpace(impact.ObjectType)) {
	case "palle":
		lowerObjectID := strings.ToLower(impact.ObjectID)
		if strings.Contains(lowerObjectID, "left") {
			return "flipper_left", true
		}
		if strings.Contains(lowerObjectID, "right") {
			return "flipper_right", true
		}
	case "bumper":
		return "back_center", true
	}

	return "", false
}

func (b *MQTTBridge) PublishLEDFlash() bool {
	return b.publishRaw(defaultLEDFlashTopic, b.config.LEDQoS, nil)
}

func (b *MQTTBridge) publishJSON(topic string, qos byte, payload any) bool {
	return b.publishRaw(topic, qos, mustMarshalJSON(payload))
}

func (b *MQTTBridge) publishRaw(topic string, qos byte, payload []byte) bool {
	if b.client == nil || !b.client.IsConnectionOpen() {
		log.Printf("MQTT indisponible, publication ignorée sur %s", topic)
		return false
	}

	token := b.client.Publish(topic, qos, false, payload)
	if !token.WaitTimeout(5 * time.Second) {
		log.Printf("Timeout pendant la publication MQTT sur %s", topic)
		return false
	}

	if err := token.Error(); err != nil {
		log.Printf("Échec publication MQTT sur %s: %v", topic, err)
		return false
	}

	return true
}