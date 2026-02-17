# Stack Technique

## Vue d'ensemble

Le projet Flipper est une simulation de flipper virtuel multijoueur combinant une interface 3D temps réel avec des contrôleurs physiques IoT. L'architecture repose sur une séparation claire entre frontend Web, backend applicatif et couche matérielle.

## Tableau récapitulatif

| Composant | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| **Backend** | Go (Golang) | 1.26+ | Concurrence native, latence minimale, binaire unique |
| **Frontend** | Three.js | r160+ | Rendu 3D performant, physique avec Cannon.js |
| **Communication Web** | WebSockets | RFC 6455 | Full-duplex, faible latence, push temps réel |
| **IoT - Microcontrôleur** | ESP32 | - | Wi-Fi intégré, GPIO, faible coût |
| **IoT - Protocole** | MQTT (Mosquitto) | 3.1.1 | Pub/Sub, QoS, tolérance aux déconnexions |
| **Gestion de version** | Git (Gitflow) | - | Workflow structuré pour équipe de 5 |

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Navigateur)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Three.js + Cannon.js (Rendu 3D + Physique)     │   │
│  └────────────────────┬─────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │ WebSocket (Bi-directionnel)
┌───────────────────────┼─────────────────────────────────┐
│                       ▼          BACKEND                │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Go Server (Goroutines)                          │   │
│  │  - Gestion WebSocket (score, événements)        │   │
│  │  - Client MQTT (souscription capteurs)          │   │
│  │  - Logique métier (règles du jeu)               │   │
│  └────────────────────┬─────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │ MQTT (Pub/Sub)
┌───────────────────────┼─────────────────────────────────┐
│                       ▼          IoT                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Mosquitto Broker                               │    │
│  └────────────────────┬────────────────────────────┘    │
│                       │ MQTT Topics                     │
│  ┌────────────────────┼─────────────────────────────┐   │
│  │     ESP32 (Wi-Fi + GPIO)                         │   │
│  │  - Bumpers (lecture capteurs)                    │   │
│  │  - Boutons flipper (entrées digitales)          │   │
│  │  - LEDs / Solénoïdes (sorties)                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Justifications détaillées

### 1. Backend : Go (Golang)

Le choix de Go pour le backend d'un flipper est stratégique pour trois raisons majeures :

#### 1.1 Gestion de la concurrence (Goroutines)
Un flipper doit gérer plusieurs événements simultanés : la bille touche un bumper, le score se met à jour, une musique se lance, le WebSocket diffuse les événements aux 3 écrans. Go gère cela nativement avec des **goroutines** ultra-légères (2 Ko de stack vs 1-2 Mo pour un thread Java), permettant de gérer des milliers d'événements concurrents sans surconsommation mémoire.


#### 1.2 Latence minimale
Contrairement à Python ou Node.js (interprétés), **Go est compilé en code machine**. Pour un flipper, chaque milliseconde compte entre le contact physique d'un bumper et la réaction visuelle. Go offre une latence typique de **< 1ms** pour le traitement d'événements, contre ~5-10ms pour Node.js sous charge.

#### 1.3 Robustesse du binaire
Go produit un **binaire unique et statiquement lié** (sans dépendances externes). C'est idéal pour un projet IoT car vous pouvez le déployer facilement sur n'importe quel serveur (même un Raspberry Pi) sans gérer Node.js, pip, ou JVM.


### 2. Frontend : Three.js + Cannon.js

#### 2.1 Three.js (Rendu 3D)
**Three.js** est la bibliothèque WebGL de référence pour le rendu 3D dans le navigateur :
- **Performance** : Utilise WebGL 2.0 pour l'accélération GPU native
- **Écosystème** : Modèles 3D (GLTF), lumières, ombres, post-processing
- **Compatibilité** : Fonctionne sur Chrome, Firefox, Safari (98% des navigateurs modernes)

#### 2.2 Cannon.js (Moteur physique)
Pour simuler les rebonds de la bille, collisions avec les bumpers, et gravité :
- **Moteur physique 3D complet** (corps rigides, contraintes, collision)
- **Intégration Three.js** : Synchronisation automatique entre rendu visuel et simulation physique
- **Léger** : ~150 Ko minifié (vs 1+ Mo pour des alternatives comme Ammo.js)

---

### 3. Communication : WebSockets

Le choix du **WebSocket** (RFC 6455) repose sur l'exigence de **communication continue TCP** :

#### 3.1 Communication Full-Duplex
Contrairement au **HTTP classique** où le client doit "demander" une mise à jour (polling), le WebSocket permet au serveur Go de **pousser** instantanément le nouveau score ou un événement au Frontend dès qu'il se produit. Cela élimine le délai de polling (typiquement 100-500ms).

**Avantages mesurables :**
- Latence : **~5-20ms** (WebSocket) vs 100-500ms (HTTP long polling)
- Bande passante : **économie de 98%** (pas de headers HTTP répétés)

#### 3.2 Synchronisation multi-écrans
Le projet prévoit **3 écrans** affichant la même partie. Le WebSocket garantit que tous les clients reçoivent les événements dans le même ordre et au même moment (broadcast côté serveur).

---

### 4. IoT : ESP32 + Mosquitto (MQTT)

C'est le cœur de la partie IoT du projet.

#### 4.1 ESP32 : Le microcontrôleur
**L'ESP32** est le "couteau suisse" de l'IoT pour ce projet :
- **Wi-Fi intégré** : Connexion native au broker Mosquitto sans modules externes
- **GPIO nombreux** : 34+ pins pour connecter bumpers, boutons, LEDs, solénoïdes
- **Puissance** : Dual-core 240 MHz, suffisant pour lire des capteurs à 1 kHz et publier via MQTT
- **Coût** : ~3-5€ par module (vs 40€ pour un Arduino avec shield Wi-Fi)

#### 4.2 Protocole MQTT via Mosquitto

**Mosquitto** est le broker MQTT open-source le plus utilisé. Le protocole MQTT apporte :

##### a) Fiabilité (QoS - Quality of Service)
MQTT est conçu pour les **réseaux instables**. Si un message est envoyé par un bumper, Mosquitto garantit sa livraison grâce aux niveaux QoS :
- **QoS 0** : "Au plus une fois" (fire-and-forget, pour événements non critiques)
- **QoS 1** : "Au moins une fois" (avec accusé de réception, pour score)
- **QoS 2** : "Exactement une fois" (pour transactions critiques)

##### b) Architecture Pub/Sub (Publish/Subscribe)
Cela permet de **découpler totalement** le matériel (ESP32) du logiciel (Backend Go) :
- L'ESP32 **publie** l'événement sur le topic `flipper/sensor/bumper1`
- Le backend Go **souscrit** à tous les topics `flipper/sensor/#`
- Si on ajoute un nouveau capteur, aucun changement côté backend (juste un nouveau topic)

**Architecture scalable :**
```
ESP32_1 → flipper/sensor/bumper1 ┐
ESP32_2 → flipper/sensor/bumper2 ├→ Mosquitto → Backend Go
ESP32_3 → flipper/input/flipperL ┘
```

##### c) Faible overhead
Les messages MQTT ont un **header de seulement 2 octets** (vs 200-800 octets pour HTTP). Sur un réseau Wi-Fi local, cela garantit une latence de **5-15ms** entre appui physique et réception côté serveur.

---

## Alternatives considérées

| Technologie actuelle | Alternative évaluée | Raison du rejet |
|---------------------|---------------------|-----------------|
| **Go** | Node.js | Latence plus élevée (event loop), consommation mémoire |
| **Go** | Python (Flask) | GIL limite la concurrence, latence ~10x supérieure |
| **WebSocket** | HTTP/2 Server-Sent Events | Unidirectionnel (serveur → client uniquement) |
| **MQTT** | HTTP REST direct | Overhead 10x supérieur, pas de Pub/Sub natif |
| **ESP32** | Arduino Uno + Shield Wi-Fi | Coût 3x plus élevé, configuration complexe |
| **Three.js** | Babylon.js | Courbe d'apprentissage plus raide, communauté plus petite |

---

## Outils de développement

| Outil | Usage | Lien |
|-------|-------|------|
| **Visual Studio Code** | IDE principal (Go, JS, Markdown) | [code.visualstudio.com](https://code.visualstudio.com) |
| **Postman** | Test des API HTTP/WebSocket | [postman.com](https://postman.com) |
| **MQTT Explorer** | Debug topics MQTT et messages | [mqtt-explorer.com](https://mqtt-explorer.com) |
| **Git** | Gestion de version (Gitflow) | [git-scm.com](https://git-scm.com) |
| **Arduino IDE** | Programmation ESP32 | [arduino.cc](https://arduino.cc) |
| **PlatformIO** | Alternative IDE pour ESP32 (optionnel) | [platformio.org](https://platformio.org) |

---

## Dépendances et bibliothèques

### Backend (Go)
```go
// go.mod
module github.com/flipper/backend

go 1.26

require (
    github.com/gorilla/websocket v1.5.0     // WebSocket serveur
    github.com/eclipse/paho.mqtt.golang v1.4.3  // Client MQTT
)
```


### IoT (ESP32 - Arduino)
```cpp
// platformio.ini ou Arduino IDE
#include <WiFi.h>
#include <PubSubClient.h>  // Bibliothèque MQTT pour ESP32
```


**Document rédigé par** :Modestin
**Dernière mise à jour** : 17 février 2026  
**Version** : 0.1.0