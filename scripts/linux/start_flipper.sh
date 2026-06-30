#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.playfield-run"
VENV_DIR="$ROOT_DIR/.venv-playfield"
DAEMON_PID_FILE="$LOG_DIR/esp32_button_daemon.pid"
FRONTEND_URL="${FLIPPER_FRONTEND_URL:-http://localhost:3001}"
BUTTON_SOURCE="${FLIPPER_BUTTON_SOURCE:-auto}"
KIOSK_PORT="${KIOSK_PORT:-32789}"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker est introuvable. Installe Docker avant de lancer le playfield."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo "Docker Compose est introuvable."
  exit 1
fi

port_is_used() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$KIOSK_PORT" 2>/dev/null | grep -q LISTEN
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$KIOSK_PORT" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

KIOSK_CONTAINER="$("${DOCKER_COMPOSE[@]}" ps -q frontend_kiosk 2>/dev/null || true)"
KIOSK_CONTAINER_OWNS_PORT=0
if [ -n "$KIOSK_CONTAINER" ] && docker port "$KIOSK_CONTAINER" 80/tcp 2>/dev/null | grep -q ":$KIOSK_PORT$"; then
  KIOSK_CONTAINER_OWNS_PORT=1
fi

if port_is_used && [ "$KIOSK_CONTAINER_OWNS_PORT" != "1" ]; then
  echo "La porte $KIOSK_PORT est déjà utilisée par un autre service."
  echo "Arrête ou reconfigure ce service avant de lancer le projet."
  exit 2
fi

echo "Démarrage des services Docker..."
"${DOCKER_COMPOSE[@]}" up -d --build

echo "Vérification des services..."
SERVICES_READY=0
for _ in $(seq 1 30); do
  BACKEND_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' playfield-backend 2>/dev/null || true)"
  if [ "$BACKEND_HEALTH" = "healthy" ]; then
    SERVICES_READY=1
    break
  fi
  sleep 2
done

if [ "$SERVICES_READY" != "1" ]; then
  echo "Le backend n'est pas devenu opérationnel."
  "${DOCKER_COMPOSE[@]}" ps
  exit 3
fi

http_is_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$1" >/dev/null
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$1" >/dev/null
  else
    return 0
  fi
}

for URL in \
  "http://localhost:3001" \
  "http://localhost:3002" \
  "http://localhost:3003" \
  "http://localhost:$KIOSK_PORT/?screen=playfield"; do
  if ! http_is_ready "$URL"; then
    echo "Service inaccessible : $URL"
    exit 3
  fi
done

if [ "$BUTTON_SOURCE" = "auto" ] || [ "$BUTTON_SOURCE" = "esp32" ]; then
  if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
  fi

  "$VENV_DIR/bin/python" -m pip install -q -r "$ROOT_DIR/iot/scripts/requirements.txt"

  ESP32_PORT="$($VENV_DIR/bin/python "$ROOT_DIR/iot/scripts/esp32_button_daemon.py" --detect-port 2>/dev/null || true)"

  if [ -z "$ESP32_PORT" ] && [ "$BUTTON_SOURCE" = "esp32" ]; then
    echo "ESP32 introuvable alors qu'il est obligatoire."
    exit 4
  elif [ -z "$ESP32_PORT" ]; then
    echo "ESP32 introuvable, utilisation du clavier physique."
    BUTTON_SOURCE="keyboard"
  elif [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
    BUTTON_SOURCE="esp32"
    echo "Le daemon boutons ESP32 est déjà lancé."
  else
    BUTTON_SOURCE="esp32"
    echo "ESP32 détecté sur $ESP32_PORT."
    echo "Démarrage du daemon boutons ESP32..."
    nohup "$VENV_DIR/bin/python" "$ROOT_DIR/iot/scripts/esp32_button_daemon.py" \
      --port "$ESP32_PORT" \
      --clavier \
      > "$LOG_DIR/esp32_button_daemon.log" 2>&1 &
    echo "$!" > "$DAEMON_PID_FILE"

    sleep 2
    if ! kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
      rm -f "$DAEMON_PID_FILE"
      if [ "$BUTTON_SOURCE" = "esp32" ]; then
        echo "Le daemon ESP32 n'a pas pu démarrer."
        cat "$LOG_DIR/esp32_button_daemon.log"
        exit 5
      fi
      echo "Le daemon ESP32 n'a pas pu démarrer, utilisation du clavier physique."
      BUTTON_SOURCE="keyboard"
    fi
  fi
fi

if [ "$BUTTON_SOURCE" = "keyboard" ]; then
  echo "Boutons physiques utilisés comme clavier."
fi

if [ "${FLIPPER_MANAGED_KIOSK:-0}" = "1" ]; then
  echo "Le kiosque physique ouvre automatiquement les trois écrans."
  echo "Playfield : http://localhost:$KIOSK_PORT/?screen=playfield"
  echo "Backglass : http://localhost:$KIOSK_PORT/?screen=backglass"
  echo "DMD       : http://localhost:$KIOSK_PORT/?screen=dmd"
  echo "Flipper lancé."
  exit 0
fi

echo "Ouverture du jeu : $FRONTEND_URL"
if command -v chromium-browser >/dev/null 2>&1; then
  if [ "${FLIPPER_KIOSK:-0}" = "1" ]; then
    nohup chromium-browser --kiosk "$FRONTEND_URL" >/dev/null 2>&1 &
  else
    nohup chromium-browser "$FRONTEND_URL" >/dev/null 2>&1 &
  fi
elif command -v chromium >/dev/null 2>&1; then
  if [ "${FLIPPER_KIOSK:-0}" = "1" ]; then
    nohup chromium --kiosk "$FRONTEND_URL" >/dev/null 2>&1 &
  else
    nohup chromium "$FRONTEND_URL" >/dev/null 2>&1 &
  fi
elif command -v google-chrome >/dev/null 2>&1; then
  if [ "${FLIPPER_KIOSK:-0}" = "1" ]; then
    nohup google-chrome --kiosk "$FRONTEND_URL" >/dev/null 2>&1 &
  else
    nohup google-chrome "$FRONTEND_URL" >/dev/null 2>&1 &
  fi
elif command -v firefox >/dev/null 2>&1; then
  if [ "${FLIPPER_KIOSK:-0}" = "1" ]; then
    nohup firefox --kiosk "$FRONTEND_URL" >/dev/null 2>&1 &
  else
    nohup firefox "$FRONTEND_URL" >/dev/null 2>&1 &
  fi
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$FRONTEND_URL" >/dev/null 2>&1 &
else
  echo "Navigateur introuvable. Ouvre manuellement : $FRONTEND_URL"
fi

echo "Flipper lancé."
if [ "$BUTTON_SOURCE" = "esp32" ] || [ -f "$DAEMON_PID_FILE" ]; then
  echo "Logs du daemon : $LOG_DIR/esp32_button_daemon.log"
fi
