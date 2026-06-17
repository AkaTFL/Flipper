#!/usr/bin/env bash

# Petit helper Docker Compose pour le projet
# Usage: ./dev.sh [commande]

set -e

COMMAND="${1:-up}"

# Couleurs terminal
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

say() {
  echo -e "${BLUE}$1${RESET}"
}

success() {
  echo -e "${GREEN}$1${RESET}"
}

warn() {
  echo -e "${YELLOW}$1${RESET}"
}

error() {
  echo -e "${RED}$1${RESET}"
}

compose() {
  docker-compose "$@"
}

show_help() {
  echo ""
  echo "Usage:"
  echo "  $0 <commande>"
  echo ""
  echo "Commandes disponibles:"
  echo ""
  echo "  up                 🚀 Démarrer l'environnement dev"
  echo "  down               🛑 Arrêter les services"
  echo "  logs               📋 Voir tous les logs"
  echo "  logs-backend       📋 Logs du backend"
  echo "  logs-frontend      📋 Logs des frontends"
  echo "  restart            🔄 Redémarrer les services"
  echo "  rebuild            🏗️ Rebuild complet"
  echo "  rebuild-backend    🏗️ Rebuild backend uniquement"
  echo "  test               🧪 Lancer les tests"
  echo ""
}

start() {
  say "🚀 Démarrage de l'environnement de développement..."
  ENV=dev compose up --build
}

stop() {
  warn "🛑 Arrêt des containers..."
  compose down
}

logs() {
  say "📋 Affichage des logs..."
  compose logs -f
}

logs_backend() {
  say "📋 Logs du backend..."
  compose logs -f backend
}

logs_frontend() {
  say "📋 Logs des frontends..."
  compose logs -f frontend_flipper frontend_backglass frontend_dmd
}

restart() {
  warn "🔄 Redémarrage des services..."
  compose restart
}

rebuild() {
  say "🏗️ Reconstruction complète des images..."
  ENV=dev compose build --no-cache
}

rebuild_backend() {
  say "🏗️ Reconstruction du backend..."
  ENV=dev compose build --no-cache backend
}

test() {
  say "🧪 Lancement des tests..."
  compose exec backend go test -v ./...
}

case "$COMMAND" in

  up)
    start
    ;;

  down)
    stop
    ;;

  logs)
    logs
    ;;

  logs-backend)
    logs_backend
    ;;

  logs-frontend)
    logs_frontend
    ;;

  restart)
    restart
    ;;

  rebuild)
    rebuild
    ;;

  rebuild-backend)
    rebuild_backend
    ;;

  test)
    test
    ;;

  *)
    error "❌ Commande inconnue : $COMMAND"
    show_help
    exit 1
    ;;

esac