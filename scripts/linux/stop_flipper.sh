#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.flipper-run"
DAEMON_PID_FILE="$LOG_DIR/esp32_button_daemon.pid"

cd "$ROOT_DIR"

if [ -f "$DAEMON_PID_FILE" ]; then
  PID="$(cat "$DAEMON_PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    echo "Arrêt du daemon boutons ESP32..."
    kill "$PID"
  fi
  rm -f "$DAEMON_PID_FILE"
fi

if docker compose version >/dev/null 2>&1; then
  docker compose down
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose down
else
  echo "Docker Compose est introuvable, arrêt des conteneurs ignoré."
fi

echo "Flipper arrêté."
