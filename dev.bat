@echo off
REM Script de démarrage du développement avec hot reload (Windows)
REM Usage: dev.bat [up|down|logs|rebuild]

setlocal enabledelayedexpansion
set COMMAND=%1
if "!COMMAND!"=="" set COMMAND=up

if "!COMMAND!"=="up" (
    echo 🚀 Démarrage en mode développement avec hot reload...
    set ENV=dev
    docker-compose up --build
) else if "!COMMAND!"=="down" (
    echo 🛑 Arrêt des containers...
    docker-compose down
) else if "!COMMAND!"=="logs" (
    echo 📋 Affichage des logs...
    docker-compose logs -f
) else if "!COMMAND!"=="logs-backend" (
    echo 📋 Logs du backend...
    docker-compose logs -f backend
) else if "!COMMAND!"=="logs-frontend" (
    echo 📋 Logs du frontend...
    docker-compose logs -f frontend_playfield frontend_backglass frontend_dmd
) else if "!COMMAND!"=="restart" (
    echo 🔄 Redémarrage des services...
    docker-compose restart
) else if "!COMMAND!"=="rebuild" (
    echo 🏗️ Rebuild de toutes les images...
    set ENV=dev
    docker-compose build --no-cache
) else if "!COMMAND!"=="rebuild-backend" (
    echo 🏗️ Rebuild du backend...
    set ENV=dev
    docker-compose build --no-cache backend
) else if "!COMMAND!"=="test" (
    echo 🧪 Exécution des tests...
    docker-compose exec backend go test -v ./...
) else (
    echo Usage: %0 [up^|down^|logs^|logs-backend^|logs-frontend^|restart^|rebuild^|rebuild-backend^|test]
    echo.
    echo Commandes disponibles:
    echo   up                 - Démarrer en mode développement
    echo   down               - Arrêter les services
    echo   logs               - Afficher tous les logs
    echo   logs-backend       - Afficher les logs du backend
    echo   logs-frontend      - Afficher les logs du frontend
    echo   restart            - Redémarrer les services
    echo   rebuild            - Rebuilder toutes les images
    echo   rebuild-backend    - Rebuilder le backend
    echo   test               - Exécuter les tests
    exit /b 1
)
