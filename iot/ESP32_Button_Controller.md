# Contrôleur boutons ESP32

Ce document décrit le test des boutons physiques pour l'issue `#148`.

## Matériel

- ESP32 DevKit avec module `ESP32-WROOM-32D`
- 8 boutons
- 1 plunger branché comme bouton
- câble USB vers l'ordinateur

Les boutons utilisent le pull-up interne de l'ESP32. Il ne faut pas brancher les
boutons sur le `5V`.

```text
GPIO ---- bouton ---- GND
```

Bouton relâché : `HIGH`  
Bouton appuyé : `LOW`

## Mapping GPIO

| Fonction | GPIO ESP32 | Nom série |
|---|---:|---|
| Bouton noir gauche | `16` | `button_black_left` |
| Bouton blanc gauche | `4` | `button_white_left` |
| Bouton vert face gauche | `17` | `button_front_left_green` |
| Bouton jaune face gauche | `18` | `button_front_left_yellow` |
| Bouton rouge face gauche | `19` | `button_front_left_red` |
| Bouton noir droit | `13` | `button_black_right` |
| Bouton blanc droit | `25` | `button_white_right` |
| Bouton blanc face | `33` | `button_front_white` |
| Plunger | `32` | `plunger` |

Le GPIO `32` est lu comme un bouton. Le jeu utilise la durée entre `APPUI
plunger` et `RELACHE plunger` pour régler la force de lancement de la bille.

## Code ESP32

Le sketch Arduino est ici :

```text
iot/firmware/esp32_button_controller/esp32_button_controller.ino
```

Réglages Arduino IDE :

- carte : `ESP32 Dev Module`
- moniteur série : `115200`

Sortie attendue :

```text
Test controles Flipper ESP32 pret
APPUI button_white_left
RELACHE button_white_left
APPUI plunger
RELACHE plunger
```

## Script ordinateur

Le script lit l'USB série et peut transformer les messages en touches clavier.
Il fonctionne sur macOS, Windows et Linux avec Python.

Installation macOS / Linux :

```bash
python3 -m venv /tmp/flipper-esp32-venv
source /tmp/flipper-esp32-venv/bin/activate
pip install -r iot/scripts/requirements.txt
```

Installation Windows PowerShell :

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r iot\scripts\requirements.txt
```

Lister les ports :

```bash
python iot/scripts/esp32_button_daemon.py --list-ports
```

Sur Windows :

```powershell
python iot\scripts\esp32_button_daemon.py --list-ports
```

Test sans envoyer les touches :

```bash
python iot/scripts/esp32_button_daemon.py --port /dev/cu.usbserial-0001
```

Sur Windows, le port ressemble plutôt à `COM3` :

```powershell
python iot\scripts\esp32_button_daemon.py --port COM3
```

Mode clavier :

```bash
python iot/scripts/esp32_button_daemon.py --port /dev/cu.usbserial-0001 --clavier
```

Windows :

```powershell
python iot\scripts\esp32_button_daemon.py --port COM3 --clavier
```

Il faut garder la fenêtre du jeu au premier plan pendant le test.

Sur macOS, il peut être nécessaire d'autoriser le terminal dans les réglages
d'accessibilité.

## Mapping clavier

| Nom série | Touche envoyée |
|---|---|
| `button_black_left` | `a` |
| `button_white_left` | `x` |
| `button_front_left_green` | `g` |
| `button_front_left_yellow` | `b` |
| `button_front_left_red` | `h` |
| `button_black_right` | `e` |
| `button_white_right` | `c` |
| `button_front_white` | `f` |
| `plunger` | `d` |

Exemple pour changer une touche :

```bash
python iot/scripts/esp32_button_daemon.py \
  --port /dev/cu.usbserial-0001 \
  --clavier \
  --map plunger=d
```
