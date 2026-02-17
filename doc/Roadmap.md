## 9. Roadmap

========================================================
SEMAINE 1 (23 fév – 1 mars)
Initialisation technique
========================================================

Modestin (Backend Go)
- Setup serveur Go
- WebSocket minimal

Charles (ESP32 + MQTT)
- Installation Mosquitto
- Test publication MQTT simple

Hugo (Frontend 3D)
- Setup Three.js
- Scène vide + caméra

Baptiste (Art 3D)
- Début modélisation table

Raphael (Tests & CI/CD)
- Setup Gitflow
- Pipeline CI (build Go)

--------------------------------------------------------

SEMAINE 2 (2 mars – 8 mars)
Validation flux complet
--------------------------------------------------------

Modestin
- Intégration client MQTT côté backend
- Relay MQTT → WebSocket

Charles
- Connexion ESP32 au broker

Hugo
- Réception WebSocket frontend

Baptiste
- Modélisation flippers

Raphael
- Tests unitaires backend
- Vérification build automatique

Livrable : flux complet capteur → navigateur

========================================================
SEMAINE 3 (9 mars – 15 mars)
Structuration backend & physique
========================================================

Modestin
- Struct Game / Player
- Event dispatcher

Charles
- Standardisation topics MQTT

Hugo
- Intégration Rapier
- Bille dynamique

Baptiste
- Obstacles 3D

Raphael
- Activation race detector
- Tests concurrence backend

--------------------------------------------------------

SEMAINE 4 (16 mars – 22 mars)
Gameplay clavier
--------------------------------------------------------

Modestin
- Gestion score backend

Charles
- Validation stabilité MQTT

Hugo
- Flippers clavier
- Détection collisions

Baptiste
- Ajustement modèles 3D

Raphael
- Tests unitaires score

Livrable : prototype jouable clavier

========================================================
SEMAINE 5 (23 mars – 29 mars)
États du jeu
========================================================

Modestin
- États : IDLE / PLAYING / GAME_OVER

Charles
- Tests QoS MQTT

Hugo
- Affichage score Playfield

Baptiste
- Début design DMD

Raphael
- Tests transitions d’état

--------------------------------------------------------

SEMAINE 6 (30 mars – 5 avril)
Stabilisation MVP
--------------------------------------------------------

Modestin
- Sécurisation concurrence backend

Charles
- Optimisation publication MQTT

Hugo
- Ajustement collisions

Baptiste
- Optimisation assets 3D

Raphael
- Pipeline CI étendu
- Lint JS + Go

Livrable : MVP stable

========================================================
SEMAINE 7 (6 avril – 12 avril)
Synchronisation Playfield / Backglass
========================================================

Modestin
- Broadcast structuré WebSocket

Charles
- Monitoring broker MQTT

Hugo
- Synchronisation Playfield / Backglass

Baptiste
- Animations Backglass

Raphael
- Tests multi-clients WebSocket

--------------------------------------------------------

SEMAINE 8 (13 avril – 19 avril)
Synchronisation DMD
--------------------------------------------------------

Modestin
- Validation ordre des événements

Charles
- Tests stabilité MQTT

Hugo
- Intégration DMD

Baptiste
- Finalisation UI rétro

Raphael
- Tests robustesse WebSocket

Livrable : 3 applications synchronisées

========================================================
SEMAINE 9 (20 avril – 26 avril)
Intégration IoT boutons
========================================================

Modestin
- Traitement événements physiques backend

Charles
- Mapping GPIO X, C, D, F

Hugo
- Réaction visuelle aux événements physiques

Baptiste
- Ajustement visuel éléments physiques

Raphael
- Tests end-to-end simulés

--------------------------------------------------------

SEMAINE 10 (27 avril – 3 mai)
Intégration solénoïdes
--------------------------------------------------------

Modestin
- Sécurité anti-doublons événements

Charles
- Pilotage solénoïdes ESP32

Hugo
- Animation visuelle synchronisée

Baptiste
- Ajustement visuel animations

Raphael
- Tests latence IoT → Frontend

Livrable : flipper physique fonctionnel

========================================================
SEMAINE 11 (4 mai – 10 mai)
Stabilisation IoT
========================================================

Modestin
- Optimisation backend

Charles
- Tests matériel réels

Hugo
- Optimisation performance rendu

Baptiste
- Optimisation modèles

Raphael
- Tests robustesse + monitoring CI

--------------------------------------------------------

SEMAINE 12 (11 mai – 17 mai)
Intégration IA — Analyse
--------------------------------------------------------

Modestin
- API backend pour module IA

Charles
- Transmission données capteurs au backend

Hugo
- Affichage résultats IA sur DMD

Baptiste
- UI visuelle pour feedback IA

Raphael
- Tests performance backend

--------------------------------------------------------

SEMAINE 13 (18 mai – 24 mai)
IA avancée
--------------------------------------------------------

Modestin
- Intégration logique IA côté backend

Charles
- Vérification stabilité MQTT

Hugo
- Ajustement interface IA

Baptiste
- Ajustement visuel IA

Raphael
- Tests charge backend

--------------------------------------------------------

SEMAINE 14 (25 mai – 31 mai)
Optimisation globale
--------------------------------------------------------

Modestin
- Optimisation concurrence

Charles
- Stabilisation MQTT

Hugo
- Optimisation FPS

Baptiste
- Finalisation assets

Raphael
- Augmentation couverture tests

Livrable : Release Candidate

========================================================
SEMAINE 15 (1 juin – 7 juin)
Documentation
========================================================

Modestin
- Documentation backend

Charles
- Documentation IoT

Hugo
- Documentation frontend

Baptiste
- Documentation assets

Raphael
- Vérification pipeline complet

--------------------------------------------------------

SEMAINE 16 (8 juin – 12 juin)
Soutenance
--------------------------------------------------------

Modestin
- Validation backend final

Charles
- Validation IoT final

Hugo
- Validation frontend final

Baptiste
- Validation assets final

Raphael
- Tag v1.0.0
- Gel du code
- Vérification CI stable