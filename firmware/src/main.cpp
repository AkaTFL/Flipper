#include <Arduino.h>

static const uint32_t BAUD = 115200;
static const uint32_t DEBOUNCE_MS = 8;
static const uint32_t HEARTBEAT_MS = 250;

struct Button {
  const char *id;
  uint8_t pin;
  bool stable;
  bool lastRead;
  uint32_t changedAt;
};

Button buttons[] = {
  { "black-left",        16, false, false, 0 },
  { "white-left",         4, false, false, 0 },
  { "front-left-green",  17, false, false, 0 },
  { "front-left-yellow", 18, false, false, 0 },
  { "front-left-red",    19, false, false, 0 },
  { "black-right",       13, false, false, 0 },
  { "white-right",       25, false, false, 0 },
  { "front-white",       33, false, false, 0 },
  { "plunger",           32, false, false, 0 },
};

const int BUTTON_COUNT = sizeof(buttons) / sizeof(buttons[0]);
uint32_t lastReport = 0;

void reportState() {
  Serial.print("{\"buttons\":{");
  for (int i = 0; i < BUTTON_COUNT; i++) {
    Serial.print('"');
    Serial.print(buttons[i].id);
    Serial.print("\":");
    Serial.print(buttons[i].stable ? "true" : "false");
    if (i < BUTTON_COUNT - 1) {
      Serial.print(',');
    }
  }
  Serial.print("},\"up\":");
  Serial.print(millis());
  Serial.println('}');
}

void setup() {
  Serial.begin(BAUD);
  for (int i = 0; i < BUTTON_COUNT; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
  }
}

void loop() {
  const uint32_t now = millis();
  bool changed = false;

  for (int i = 0; i < BUTTON_COUNT; i++) {
    const bool pressed = digitalRead(buttons[i].pin) == LOW;

    if (pressed != buttons[i].lastRead) {
      buttons[i].lastRead = pressed;
      buttons[i].changedAt = now;
    }

    if (now - buttons[i].changedAt >= DEBOUNCE_MS && buttons[i].stable != pressed) {
      buttons[i].stable = pressed;
      changed = true;
    }
  }

  if (changed || now - lastReport >= HEARTBEAT_MS) {
    lastReport = now;
    reportState();
  }
}
