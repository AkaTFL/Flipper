#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.flipper-run"
VENV_DIR="$ROOT_DIR/.venv-flipper"
DAEMON_PID_FILE="$LOG_DIR/esp32_button_daemon.pid"
FRONTEND_URL="${FLIPPER_FRONTEND_URL:-http://localhost:3001}"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker est introuvable. Installe Docker avant de lancer le flipper."
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

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install -q -r "$ROOT_DIR/iot/scripts/requirements.txt"

echo "Démarrage des services Docker..."
"${DOCKER_COMPOSE[@]}" up -d --build

if [ -f "$DAEMON_PID_FILE" ] && kill -0 "$(cat "$DAEMON_PID_FILE")" 2>/dev/null; then
  echo "Le daemon boutons ESP32 est déjà lancé."
else
  echo "Démarrage du daemon boutons ESP32..."
  nohup "$VENV_DIR/bin/python" "$ROOT_DIR/iot/scripts/esp32_button_daemon.py" \
    --auto-port \
    --clavier \
    > "$LOG_DIR/esp32_button_daemon.log" 2>&1 &
  echo "$!" > "$DAEMON_PID_FILE"
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
echo "Logs du daemon : $LOG_DIR/esp32_button_daemon.log"
