package main

import "testing"

func TestClassifyMQTTMessage(t *testing.T) {
	tests := []struct {
		name  string
		topic string
		want  string
	}{
		{name: "tilt warning", topic: "playfield/sensor/tilt/warning", want: "tilt_warning"},
		{name: "tilt triggered", topic: "playfield/sensor/tilt/triggered", want: "tilt_triggered"},
		{name: "debug topic", topic: "playfield/debug/ping", want: "mqtt_debug"},
		{name: "other topic", topic: "playfield/solenoid/back_left", want: "mqtt_event"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := classifyMQTTMessage(tc.topic); got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}

func TestImpactToSolenoidTopic(t *testing.T) {
	bridge := &MQTTBridge{}

	tests := []struct {
		name   string
		impact ImpactPayload
		want   string
		wantOK bool
	}{
		{
			name:   "bumper one",
			impact: ImpactPayload{ObjectID: "bumper-1", ObjectType: "bumper"},
			want:   "back_center",
			wantOK: true,
		},
		{
			name:   "left playfield",
			impact: ImpactPayload{ObjectID: "palle-left", ObjectType: "palle"},
			want:   "playfield_left",
			wantOK: true,
		},
		{
			name:   "unknown object",
			impact: ImpactPayload{ObjectID: "mystery", ObjectType: "unknown"},
			wantOK: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := bridge.topicForImpact(tc.impact)
			if ok != tc.wantOK {
				t.Fatalf("expected ok=%v, got %v", tc.wantOK, ok)
			}
			if got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}
