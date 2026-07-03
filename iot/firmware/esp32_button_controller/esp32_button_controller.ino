const int BUTTON_BLACK_LEFT = 16;
const int BUTTON_WHITE_LEFT = 4;
const int BUTTON_FRONT_LEFT_GREEN = 17;
const int BUTTON_FRONT_LEFT_YELLOW = 18;
const int BUTTON_FRONT_LEFT_RED = 19;
const int BUTTON_BLACK_RIGHT = 13;
const int BUTTON_WHITE_RIGHT = 25;
const int BUTTON_FRONT_WHITE = 33;
const int PLUNGER = 32;

const int NB_BOUTONS = 9;
const unsigned long DEBOUNCE_MS = 30;

const int boutons[NB_BOUTONS] = {
  BUTTON_BLACK_LEFT,
  BUTTON_WHITE_LEFT,
  BUTTON_FRONT_LEFT_GREEN,
  BUTTON_FRONT_LEFT_YELLOW,
  BUTTON_FRONT_LEFT_RED,
  BUTTON_BLACK_RIGHT,
  BUTTON_WHITE_RIGHT,
  BUTTON_FRONT_WHITE,
  PLUNGER
};

const char* noms[NB_BOUTONS] = {
  "button_black_left",
  "button_white_left",
  "button_front_left_green",
  "button_front_left_yellow",
  "button_front_left_red",
  "button_black_right",
  "button_white_right",
  "button_front_white",
  "plunger"
};

int anciensEtats[NB_BOUTONS];
unsigned long dernierChangement[NB_BOUTONS];

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < NB_BOUTONS; i++) {
    pinMode(boutons[i], INPUT_PULLUP);
    anciensEtats[i] = digitalRead(boutons[i]);
    dernierChangement[i] = 0;
  }

  Serial.println("Test controles Flipper ESP32 pret");
}

void loop() {
  const unsigned long maintenant = millis();

  for (int i = 0; i < NB_BOUTONS; i++) {
    int etat = digitalRead(boutons[i]);

    if (etat == anciensEtats[i]) {
      continue;
    }

    if (maintenant - dernierChangement[i] < DEBOUNCE_MS) {
      continue;
    }

    dernierChangement[i] = maintenant;
    delay(DEBOUNCE_MS);

    int etatConfirme = digitalRead(boutons[i]);
    if (etatConfirme != etat) {
      continue;
    }

    if (etatConfirme == LOW) {
      Serial.print("APPUI ");
      Serial.println(noms[i]);
    } else {
      Serial.print("RELACHE ");
      Serial.println(noms[i]);
    }

    anciensEtats[i] = etatConfirme;
  }
}
