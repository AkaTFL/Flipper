# Architecture Hardware - Projet Flipper

**Document rédigé par** :[Modestin Hounga](https://github.com/lm-hg), [Charles GROSSIN](https://github.com/Chary85)
**Dernière mise à jour** : 20 février 2026  
**Version** : 0.1.0 
---

## Vue d'ensemble

**Ce qu'on construit :** Un playfield virtuel taille réelle avec contrôles physiques, retour haptique (10 solénoïdes) et affichage sur 3 écrans (Playfield, Backglass, DMD).

**3 dispositifs IoT :**

| IoT | Rôle | Matériel |
|-----|------|----------|
| **IoT 1** | Retour haptique (solénoïdes) | 2× ESP32 + 2× modules relais + 10 solénoïdes |
| **IoT 2** | Contrôleur joueur + Tilt | 1× ESP32 + 8 boutons + 1 plunger bouton + 1× MPU-6050 |

**Flux de données :**

1. Joueur appuie sur un bouton physique → **ESP32 Contrôleur** envoie l'état via **USB série** au PC → daemon convertit en frappe clavier
2. **Playfield** (Three.js) lit l'entrée clavier et anime le playfield / lance la bille
3. Collision détectée dans le jeu → événement envoyé au **Serveur** via WebSocket
4. Serveur met à jour le score → envoie aux **3 écrans** (Backglass, DMD, Playfield)
5. Serveur publie un message MQTT → **ESP32 Solénoïdes** activent le relais correspondant → **CLAC !**
6. **MPU-6050** détecte une secousse excessive → Tilt déclenché

---

## Architecture globale

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐              │
│   │ Backglass  │     │    DMD     │     │ Playfield  │              │
│   │ (Écran 1)  │     │ (Écran 2)  │     │ (Écran 3)  │              │
│   └─────┬──────┘     └─────┬──────┘     └─────┬──────┘              │
│         │ WS               │ WS               │ WS                  │
│         └──────────────────┼──────────────────┘                      │
│                            ▼                                         │
│                  ┌──────────────────┐                                │
│                  │   Serveur Go     │                                │
│                  │   + Mosquitto    │                                │
│                  │   (PC central)   │                                │
│                  └────────┬─────────┘                                │
│                           │                                          │
│                    │      │                                          │
│          MQTT (Wi-Fi)    │  USB série (câble)                       │
│                    │      │                                          │
│          ┌─────────┴──────┼──────┐                                  │
│          ▼                ▼      ▼                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐            │
│  │  ESP32 #1    │ │  ESP32 #2    │ │  ESP32 #3        │            │
│  │  SOLÉNOÏDES  │ │  SOLÉNOÏDES  │ │  CONTRÔLEUR      │            │
│  │  Groupe 1    │ │  Groupe 2    │ │  + TILT           │            │
│  │  (Wi-Fi)     │ │  (Wi-Fi)     │ │  (USB + Wi-Fi)   │            │
│  └──────┬───────┘ └──────┬───────┘ └────┬────────┬────┘            │
│         │                │               │        │                  │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌────┴─────┐ ┌┴───────┐        │
│  │ Module 5     │ │ Module 5     │ │8 Boutons │ │MPU-6050│        │
│  │ relais       │ │ relais       │ │1 Tirette │ │ (Tilt) │        │
│  └──────┬───────┘ └──────┬───────┘ └──────────┘ └────────┘        │
│         │                │                                          │
│  ┌──────┴───────┐ ┌──────┴───────┐    ┌────────────────┐           │
│  │ 5 Solénoïdes │ │ 5 Solénoïdes │    │  Alim 12V 5A   │           │
│  │ Back L/C/R   │ │ Middle Right │    │  (Solénoïdes)  │           │
│  │ Middle L/C   │ │ Sling L/R    │    └────────────────┘           │
│  │              │ │ Flipper L/R  │                                  │
│  └──────────────┘ └──────────────┘                                  │
└──────────────────────────────────────────────────────────────────────┘
```

**Direction des données :**
- `Serveur → ESP32 #1 / #2` : commandes MQTT via Wi-Fi pour activer les solénoïdes (sortie)
- `ESP32 #3 → PC Playfield` : boutons + tirette via **USB série** (entrée, chemin rapide)
- `ESP32 #3 → Serveur` : événements tilt via **MQTT Wi-Fi** (entrée, chemin tolérant)

---

## Stratégie de communication — Approche hybride

Le choix du type de branchement est dicté par la **contrainte de latence** : un playfield est un jeu de réflexes où chaque milliseconde compte sur les boutons.

### Comparaison des latences

| Méthode | Latence typique | Worst-case | Usage dans le projet |
|---------|----------------|------------|----------------------|
| **USB série (filaire)** | **1-4 ms** | ~5 ms | Boutons + tirette (critique) |
| BLE HID (Bluetooth) | 10-30 ms | 50-100 ms | Non retenu |
| **Wi-Fi + MQTT** | **10-25 ms** | 50-200 ms | Solénoïdes + tilt (tolérant) |

### Principe : deux chemins séparés

L'ESP32 #3 utilise **USB et Wi-Fi simultanément**. Le câble USB qui alimente l'ESP32 sert aussi à transmettre les données des boutons — un seul câble pour tout.

```
              CHEMIN RAPIDE (1-4 ms)                   CHEMIN MQTT (15-50 ms)
              ──────────────────────                   ──────────────────────

  [8 Boutons + Tirette]                              [Tilt MPU-6050]
         │                                                  │
         ▼                                                  ▼
    ┌──────────┐                                       ┌──────────┐
    │          │  USB série (câble)                     │          │  Wi-Fi
    │ ESP32 #3 ├─────────────────────► PC Playfield    │ ESP32 #3 ├──────────► Mosquitto
    │          │                       (daemon série   │          │             Broker
    └──────────┘                        → clavier)     └──────────┘              │
                                                                                 │ MQTT
    ┌──────────┐  Wi-Fi + MQTT                                                  ▼
    │ ESP32 #1 │ ◄─────────────────────────────────────────────────────── Serveur Go
    │ ESP32 #2 │  (commandes solénoïdes)
    └──────────┘
```

**Pourquoi ce choix :**

- **Boutons via USB** : latence de 1-4 ms, déterministe, pas de variabilité réseau. C'est ce que les vrais cabinets d'arcade utilisent. Le câble USB est déjà nécessaire pour alimenter l'ESP32.
- **Tilt via MQTT** : une secousse détectée avec 30 ms de retard n'a aucun impact sur le gameplay. MQTT est le bon outil ici (pub/sub, QoS).
- **Solénoïdes via MQTT** : le retour haptique arrive après la réaction visuelle à l'écran (instantanée via WebSocket). Un délai de 20-50 ms sur le "clac" est imperceptible.

### Daemon série (côté PC)

Un petit programme sur le PC lit le port série USB et convertit les données en événements clavier. Quelques lignes en Go ou Python suffisent.

L'ESP32 envoie des messages série simples :

```
BTN:X:1      → Bouton Flipper Gauche appuyé
BTN:X:0      → Bouton Flipper Gauche relâché
BTN:C:1      → Bouton Flipper Droit appuyé
PLG:0.73     → Tirette tirée à 73%
PLG:0.00     → Tirette relâchée
```

---

## IoT 1 — Solénoïdes (retour haptique)

### Principe

Les solénoïdes reproduisent le "clac" mécanique d'un vrai playfield. Quand le jeu détecte une collision (bille sur bumper, activation de playfield), le serveur envoie un message MQTT à l'ESP32 correspondant qui active un relais pendant ~50ms, déclenchant le solénoïde.

### Répartition des 10 solénoïdes sur la table

```
    ┌─────────────────────────────────────────┐
    │              PLAYFIELD                   │
    │                                          │
    │    (1)              (2)             (3)  │
    │  Back Left      Back Center     Back Right│
    │    ●                ●               ●    │
    │                                          │
    │                                          │
    │    (4)              (5)             (6)  │
    │  Middle Left   Middle Center  Middle Right│
    │    ●                ●               ●    │
    │                                          │
    │                                          │
    │  (7)                              (8)    │
    │  Left Slingshot           Right Slingshot │
    │    ●                              ●      │
    │                                          │
    │  (9)                              (10)   │
    │  Left Flipper             Right Flipper   │
    │    ◄►                             ◄►     │
    │                                          │
    │              [  Lanceur  ]               │
    └─────────────────────────────────────────┘
```

### Attribution aux 2 ESP32

| ESP32 | Solénoïdes pilotés | Relais utilisés |
|-------|-------------------|-----------------|
| **#1** | Back Left, Back Center, Back Right, Middle Left, Middle Center | 5 relais |
| **#2** | Middle Right, Left Slingshot, Right Slingshot, Left Flipper, Right Flipper | 5 relais |

### Pourquoi des diodes flyback ?

Les solénoïdes sont des charges inductives. À la coupure, ils génèrent une surtension inverse (back-EMF) qui peut détruire le relais ou l'ESP32. Une diode 1N4007 en parallèle sur chaque solénoïde absorbe cette surtension.

---

## IoT 2 — Contrôleur joueur

### Principe

L'ESP32 Contrôleur est connecté au PC du Playfield par **câble USB** et transmet les états des boutons et de la tirette via **USB série**. Un daemon sur le PC convertit ces données en événements clavier. Simultanément, l'ESP32 utilise le **Wi-Fi** pour publier les événements tilt via MQTT.

### Vue physique des contrôles

```
                    ┌──────────────────────────────┐
                    │         FACE AVANT            │
                    │                               │
                    │ [Green] [Yellow] [Red] [White] ← boutons face
                    │ (Green) (Face 2) (Face 3) (Jeton)
                    │                               │
                    │                         ║═══║ │
                    │                         ║ T ║ ← Plunger
                    │                         ║ I ║   bouton de lancement
                    │                         ║ R ║
  CÔTÉ GAUCHE       │                         ║═══║ │       CÔTÉ DROIT
  ┌────────┐        │                               │        ┌────────┐
  │Bouton 1│        │                               │        │Bouton 3│
  │(Flip G)│        │         PLAYFIELD              │        │(Flip D)│
  │        │        │                               │        │        │
  │Bouton 2│        │                               │        │Bouton 4│
  │(Gauche)│        │                               │        │(Droit) │
  └────────┘        │                               │        └────────┘
                    │          [Jeton]              │
                    │        (mécanisme             │
                    │         monnaie)              │
                    └──────────────────────────────┘
```

### Inventaire complet des entrées (9 au total)

**8 boutons digitaux (0 ou 1) :**

| # | Position | Bouton | Touche simulée | Type |
|---|----------|--------|----------------|------|
| 1 | Côté gauche | button white left | `X` | Digital |
| 2 | Côté gauche | button black left | `A` | Digital |
| 3 | Côté droit | button white right | `C` | Digital |
| 4 | Côté droit | button black right | `E` | Digital |
| 5 | Face avant | button front left green | `G` | Digital |
| 6 | Face avant | button front left yellow | `B` | Digital |
| 7 | Face avant | button front left red | `H` | Digital |
| 8 | Face avant | button front white | `F` | Digital |

**1 entrée plunger :**

| # | Position | Composant | Valeur | Type |
|---|----------|-----------|--------|------|
| 9 | Côté droit | plunger | appui maintenu → force de lancement, touche `D` simulée | Digital |

Le plunger est lu comme un bouton. Plus l'appui dure longtemps, plus le jeu augmente la force de lancement de la bille.

### Capteur Tilt — MPU-6050

Le MPU-6050 (accéléromètre + gyroscope 6 axes) est monté sur le meuble pour détecter les secousses excessives du joueur.

**Fonctionnement en 3 niveaux :**

| Niveau | Seuil d'accélération | Action |
|--------|---------------------|--------|
| Normal | < 1.5g | Rien |
| **Warning** | 1.5g - 2.5g | Message "WARNING" sur le DMD |
| **TILT** | > 2.5g ou 3 warnings | Partie perdue, bille drainée |

Le MPU-6050 communique en **I2C** avec l'ESP32 (2 fils seulement). Les événements tilt sont publiés via MQTT vers le serveur.

---

## Schémas de branchement détaillés

### ESP32 #1 — Solénoïdes Groupe 1

```
                                              ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                                                  ALIMENTATION 12V 5A
                                              │    ┌──────────────┐           │
                                                   │  12V+   GND │
                                              │    └──┬───────┬──┘           │
                                                     │       │
  ┌────────────────────┐    ┌──────────────┐  │      │       │               │
  │     ESP32 #1       │    │ MODULE RELAIS│       ┌─┘   ┌───┘
  │                    │    │  8 CANAUX    │  │     │     │                   │
  │                    │    │              │        │     │
  │  GPIO 12 ──────────┼───►  IN1 ── REL1 ─┼──►───┤  Solénoïde 1 (Back Left)
  │                    │    │              │        │     │                   │
  │  GPIO 13 ──────────┼───►  IN2 ── REL2 ─┼──►───┤  Solénoïde 2 (Back Center)
  │                    │    │              │        │     │                   │
  │  GPIO 14 ──────────┼───►  IN3 ── REL3 ─┼──►───┤  Solénoïde 3 (Back Right)
  │                    │    │              │        │     │                   │
  │  GPIO 15 ──────────┼───►  IN4 ── REL4 ─┼──►───┤  Solénoïde 4 (Middle Left)
  │                    │    │              │        │     │                   │
  │  GPIO 16 ──────────┼───►  IN5 ── REL5 ─┼──►───┤  Solénoïde 5 (Middle Ctr)
  │                    │    │              │  │     │     │                   │
  │  3.3V ─────────────┼───►  VCC         │      ─┘     │
  │  GND  ─────────────┼───►  GND         │  │          │                   │
  │                    │    │              │         ┌────┘
  └────────────────────┘    └──────────────┘  │     │  GND commun            │
                                              └─ ─ ┘─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

  Chaque solénoïde a une diode 1N4007 en parallèle (cathode côté 12V+)
```

**Tableau GPIO ESP32 #1 :**

| GPIO | Relais | Solénoïde | Topic MQTT |
|------|--------|-----------|------------|
| 12 | REL1 | Back Left | `playfield/solenoid/back_left` |
| 13 | REL2 | Back Center | `playfield/solenoid/back_center` |
| 14 | REL3 | Back Right | `playfield/solenoid/back_right` |
| 15 | REL4 | Middle Left | `playfield/solenoid/middle_left` |
| 16 | REL5 | Middle Center | `playfield/solenoid/middle_center` |

---

### ESP32 #2 — Solénoïdes Groupe 2

```
                                              ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
                                                  ALIMENTATION 12V 5A
                                              │  (même alim que Groupe 1)      │
                                                   ┌──────────────┐
                                              │    │  12V+   GND │            │
                                                   └──┬───────┬──┘
  ┌────────────────────┐    ┌──────────────┐  │      │       │                │
  │     ESP32 #2       │    │ MODULE RELAIS│        ┌┘    ┌──┘
  │                    │    │  8 CANAUX    │  │      │     │                  │
  │                    │    │              │         │     │
  │  GPIO 12 ──────────┼───►  IN1 ── REL1 ─┼──►────┤  Solénoïde 6  (Middle Right)
  │                    │    │              │         │     │                  │
  │  GPIO 13 ──────────┼───►  IN2 ── REL2 ─┼──►────┤  Solénoïde 7  (Left Sling)
  │                    │    │              │         │     │                  │
  │  GPIO 14 ──────────┼───►  IN3 ── REL3 ─┼──►────┤  Solénoïde 8  (Right Sling)
  │                    │    │              │         │     │                  │
  │  GPIO 15 ──────────┼───►  IN4 ── REL4 ─┼──►────┤  Solénoïde 9  (Left Flipper)
  │                    │    │              │         │     │                  │
  │  GPIO 16 ──────────┼───►  IN5 ── REL5 ─┼──►────┤  Solénoïde 10 (Right Flipper)
  │                    │    │              │  │      │     │                  │
  │  3.3V ─────────────┼───►  VCC         │        ─┘     │
  │  GND  ─────────────┼───►  GND         │  │            │                  │
  │                    │    │              │           ┌───┘
  └────────────────────┘    └──────────────┘  │       │  GND commun          │
                                              └─ ─ ─ ┘─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

  Chaque solénoïde a une diode 1N4007 en parallèle (cathode côté 12V+)
```

**Tableau GPIO ESP32 #2 :**

| GPIO | Relais | Solénoïde | Topic MQTT |
|------|--------|-----------|------------|
| 12 | REL1 | Middle Right | `playfield/solenoid/middle_right` |
| 13 | REL2 | Left Slingshot | `playfield/solenoid/sling_left` |
| 14 | REL3 | Right Slingshot | `playfield/solenoid/sling_right` |
| 15 | REL4 | Left Flipper | `playfield/solenoid/playfield_left` |
| 16 | REL5 | Right Flipper | `playfield/solenoid/playfield_right` |

---

### ESP32 #3 — Contrôleur + Tilt

```
  ┌───────────────────────────────┐
  │          ESP32 #3             │
  │        (Contrôleur)           │
  │                               │
  │  ── BOUTONS CÔTÉ GAUCHE ──   │
  │  GPIO 4  ─────────────────────┼──── button white left  ─────── GND
  │  GPIO 16 ─────────────────────┼──── button black left  ─────── GND
  │                               │
  │  ── BOUTONS CÔTÉ DROIT ────  │
  │  GPIO 25 ─────────────────────┼──── button white right ─────── GND
  │  GPIO 13 ─────────────────────┼──── button black right ─────── GND
  │                               │
  │  ── BOUTONS FACE AVANT ────  │
  │  GPIO 17 ─────────────────────┼──── button front left green ── GND
  │  GPIO 18 ─────────────────────┼──── button front left yellow ─ GND
  │  GPIO 19 ─────────────────────┼──── button front left red ──── GND
  │  GPIO 33 ─────────────────────┼──── button front white ─────── GND
  │                               │
  │  ── PLUNGER ──────────────── │
  │  GPIO 32 ────────────────────┼──── plunger ─────────────── GND
  │                               │
  │  ── CAPTEUR TILT ──────────  │
  │                               │         ┌──────────────┐
  │  GPIO 21 (SDA) ───────────────┼─────────┤  MPU-6050    │
  │  GPIO 22 (SCL) ───────────────┼─────────┤  (Tilt)      │
  │  3.3V ─────────────────────────┼─────────┤  VCC         │
  │  GND  ─────────────────────────┼─────────┤  GND         │
  │                               │         └──────────────┘
  │                               │
  │  ── COMMUNICATION ──────────  │
  │  USB série (câble) ══════════│═══════► PC Playfield
  │  (boutons + tirette)         │         (daemon série → clavier)
  │  Latence : 1-4 ms            │
  │                               │
  │  Wi-Fi ~~~~~~~~~~~~~~~~~~~~~~~│~~~~~~~~► Serveur MQTT
  │  (événements tilt)            │         (playfield/sensor/tilt/*)
  │  Latence : 15-50 ms          │
  └───────────────────────────────┘

  Boutons : pull-up interne (INPUT_PULLUP). Appui = LOW → envoi USB série.
  Plunger : pull-up interne (INPUT_PULLUP). Appui = LOW → envoi USB série.
  Le câble USB sert à la fois d'alimentation ET de communication.
```

**Tableau GPIO ESP32 #3 (11 GPIO utilisés sur 16 disponibles) :**

| GPIO | Composant | Position | Touche / Fonction | Communication |
|------|-----------|----------|-------------------|---------------|
| 16 | button black left | Côté gauche | `A` | USB série → PC |
| 4 | button white left | Côté gauche | `X` | USB série → PC |
| 17 | button front left green | Face avant | `G` | USB série → PC |
| 18 | button front left yellow | Face avant | `B` | USB série → PC |
| 19 | button front left red | Face avant | `H` | USB série → PC |
| 13 | button black right | Côté droit | `E` | USB série → PC |
| 25 | button white right | Côté droit | `C` | USB série → PC |
| 33 | button front white | Face avant | `F` | USB série → PC |
| **32** | **plunger** | **Côté droit** | **Appui maintenu, simule `D`** | **USB série → PC** |
| 21 | MPU-6050 SDA | Meuble | Données accéléromètre | I2C |
| 22 | MPU-6050 SCL | Meuble | Horloge accéléromètre | I2C |

**Note plunger :** le firmware transforme le plunger en `APPUI plunger` / `RELACHE plunger`, puis le daemon envoie la touche `D` au jeu.

**Note mapping boutons :** ce mapping reprend la machine physique fournie à l'école. Le firmware de référence se trouve dans `iot/firmware/esp32_button_controller/esp32_button_controller.ino`.

---

### Détail branchement diode flyback (par solénoïde)

```
         12V+ ────────────┐
                          │
                    ┌─────┴─────┐
                    │ Solénoïde │
                    └─────┬─────┘
                          │
              ┌───────────┤
              │           │
          ────┤►──────    │     Diode 1N4007
          (cathode   (anode)    (sens inverse : bloque en fonctionnement
           côté 12V+)           normal, absorbe le back-EMF à la coupure)
              │           │
              └───────────┤
                          │
         Relais NO ───────┘
              │
         Relais COM ──── GND 12V
```

---

## Schéma de branchement complet (vue d'ensemble)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTÈME COMPLET                                        │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                         PC CENTRAL (Serveur)                                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐   │    │
│  │  │ Serveur  │  │Mosquitto │  │  Navigateur  │  │  Navigateur           │   │    │
│  │  │ Go       │◄─┤ Broker   │  │  Playfield   │  │  Backglass + DMD      │   │    │
│  │  │          │─►│ MQTT     │  │  (Three.js)  │  │  (Canvas/Three.js)    │   │    │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └───────────┬───────────┘   │    │
│  │       │ WS          │ MQTT          │ USB série             │ WS             │    │
│  └───────┼─────────────┼──────────────┼───────────────────────┼────────────────┘    │
│          │             │              │                       │                      │
│          │      ┌──────┴──────┐       │                  ┌────┴────┐                │
│          │      │ Wi-Fi 2.4GHz│       │                  │ Écrans  │                │
│          │      └──┬───┬───┬──┘       │                  │ 2 et 3  │                │
│          │         │   │   │          │                  └─────────┘                │
│          │    ┌────┘   │   └────┐     │                                             │
│          │    ▼        ▼        ▼     ▼ USB série                                   │
│     ┌────┴────────┐ ┌─────────┐ ┌─────────────┐                                    │
│     │  ESP32 #1   │ │ESP32 #2 │ │  ESP32 #3   │                                    │
│     │  Solénoïdes │ │Solénoïd.│ │  Contrôleur │                                    │
│     │  Grp 1      │ │Grp 2    │ │  + Tilt     │                                    │
│     └──────┬──────┘ └────┬────┘ └──┬──────┬───┘                                    │
│            │             │         │      │                                          │
│     ┌──────┴──────┐ ┌────┴─────┐ ┌┴──────────────┐                                │
│     │ 5 Relais    │ │ 5 Relais │ │ 8 Boutons     │                                │
│     └──────┬──────┘ └────┬─────┘ │ 1 Tirette     │                                │
│            │             │       │ (analogique)   │                                │
│            │             │       │ + MPU-6050     │                                │
│            │             │       └────────────────┘                                │
│     ┌──────┴──────┐ ┌────┴─────┐                                                   │
│     │5 Solénoïdes │ │5 Solénoïd│   ┌────────────┐                                  │
│     │ Back L/C/R  │ │ Mid R    │   │ Alim 12V   │──── 220V secteur                 │
│     │ Mid L/C     │ │ Sling L/R│   │ 5A         │                                  │
│     │             │ │ Flip L/R │   └─────┬──────┘                                  │
│     └─────────────┘ └──────────┘         │                                          │
│                                    12V vers les                                      │
│                                    2 modules relais                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Topics MQTT

### Solénoïdes (Serveur → ESP32)

Le serveur publie sur ces topics quand un événement de jeu nécessite un retour haptique.

| Topic | Solénoïde | ESP32 |
|-------|-----------|-------|
| `playfield/solenoid/back_left` | Back Left | #1 |
| `playfield/solenoid/back_center` | Back Center | #1 |
| `playfield/solenoid/back_right` | Back Right | #1 |
| `playfield/solenoid/middle_left` | Middle Left | #1 |
| `playfield/solenoid/middle_center` | Middle Center | #1 |
| `playfield/solenoid/middle_right` | Middle Right | #2 |
| `playfield/solenoid/sling_left` | Left Slingshot | #2 |
| `playfield/solenoid/sling_right` | Right Slingshot | #2 |
| `playfield/solenoid/playfield_left` | Left Flipper | #2 |
| `playfield/solenoid/playfield_right` | Right Flipper | #2 |

**Payload :** `{"action": "activate", "duration_ms": 50}`

**Souscription ESP32 #1 :** `playfield/solenoid/back_+`, `playfield/solenoid/middle_left`, `playfield/solenoid/middle_center`  
**Souscription ESP32 #2 :** `playfield/solenoid/middle_right`, `playfield/solenoid/sling_+`, `playfield/solenoid/playfield_+`

### Tilt (ESP32 #3 → Serveur, via Wi-Fi MQTT)

| Topic | Payload | Déclencheur |
|-------|---------|-------------|
| `playfield/sensor/tilt/warning` | `{"level": 1, "acceleration": 1.8}` | Secousse légère (1.5-2.5g) |
| `playfield/sensor/tilt/triggered` | `{"level": 3, "status": "TILT"}` | 3 warnings ou secousse > 2.5g |

### LEDs (Serveur → ESP32, optionnel)

| Topic | Payload |
|-------|---------|
| `playfield/led/all` | `{"effect": "rainbow", "speed": 100}` |
| `playfield/led/flash` | `{"color": "#FF0000", "duration_ms": 200}` |

---

## Points de vigilance

### GPIO à éviter sur ESP32

**NE PAS UTILISER :**
- GPIO 0 (boot mode)
- GPIO 2 (LED interne, peut interférer)
- GPIO 5, 12, 15 (pins sensibles au démarrage selon le câblage)
- GPIO 6-11 (Flash SPI interne)
- GPIO 34-39 (input-only, pas de pull-up interne)

**GPIO retenus pour le contrôleur boutons école :** 4, 13, 16, 17, 18, 19, 25, 33.  
**GPIO retenus pour le tilt :** 21, 22.  
**GPIO retenu pour le plunger :** 32.

### Alimentation

| Composant | Consommation |
|-----------|-------------|
| 1× ESP32 | ~200 mA |
| 3× ESP32 | ~600 mA |
| Bande LED RGB | ~300 mA |
| Module relais (au repos) | ~80 mA par module |
| Solénoïde (actif, pic) | ~800 mA - 1A par solénoïde |

Le circuit 12V (solénoïdes) et le circuit 5V/3.3V (ESP32) ont des alimentations **séparées** avec un **GND commun**.

### USB série — Daemon PC

L'ESP32 #3 communique avec le PC via le port série USB (baud rate : 115200). Un daemon côté PC lit le port série et génère les événements clavier correspondants. Le PC doit reconnaître l'ESP32 comme un port COM (drivers CH340/CP2102 installés automatiquement sous Windows/Mac/Linux).

### Sécurité électrique

- **Toujours** mettre des diodes flyback sur les solénoïdes
- **Ne jamais** connecter le 12V directement à l'ESP32
- Les modules relais optocouplés assurent l'isolation galvanique
- **Couper l'alimentation 12V** avant de manipuler le câblage

---
