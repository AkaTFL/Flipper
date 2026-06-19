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
  for (int index = 0; index < BUTTON_COUNT; index++) {
    Serial.print('"');
    Serial.print(buttons[index].id);
    Serial.print("\":");
    Serial.print(buttons[index].stable ? "true" : "false");
    if (index < BUTTON_COUNT - 1) Serial.print(',');
  }
  Serial.print("},\"up\":");
  Serial.print(millis());
  Serial.println('}');
}

void setup() {
  Serial.begin(BAUD);
  for (int index = 0; index < BUTTON_COUNT; index++) {
    pinMode(buttons[index].pin, INPUT_PULLUP);
  }
}

void loop() {
  const uint32_t now = millis();
  bool changed = false;

  for (int index = 0; index < BUTTON_COUNT; index++) {
    const bool pressed = digitalRead(buttons[index].pin) == LOW;
    if (pressed != buttons[index].lastRead) {
      buttons[index].lastRead = pressed;
      buttons[index].changedAt = now;
    }
    if (now - buttons[index].changedAt >= DEBOUNCE_MS && buttons[index].stable != pressed) {
      buttons[index].stable = pressed;
      changed = true;
    }
  }

  if (changed || now - lastReport >= HEARTBEAT_MS) {
    lastReport = now;
    reportState();
  }
}
