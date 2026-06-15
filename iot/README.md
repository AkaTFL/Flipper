# IoT — Mosquitto & MQTT (Charles, semaines 1–8)

Ce dossier regroupe ce qui peut être fait **sans matériel physique** : broker, conventions de topics, tests et monitoring. La limite roadmap est la **semaine 9** (mapping GPIO) — voir l’annexe en fin de `doc/Roadmap.md`.

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) **ou** Mosquitto installé localement (Windows : `winget install EclipseFoundation.Mosquitto`).
- Python 3.10+ pour les scripts.

## Démarrer le broker (Docker)

```bash
cd iot
docker compose up -d
```

Broker : `localhost:1883` (anonyme autorisé, persistance dans un volume Docker).

Arrêt : `docker compose down`.

## Scripts Python

Sur macOS avec Python Homebrew, utilise plutôt un environnement virtuel :

```bash
python3 -m venv /tmp/flipper-esp32-venv
source /tmp/flipper-esp32-venv/bin/activate
pip install -r iot/scripts/requirements.txt
```

Sur Windows PowerShell :

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r iot\scripts\requirements.txt
```

| Script | Rôle |
|--------|------|
| `publish_hello.py` | Publication minimale (semaine 1) |
| `fake_esp32_publisher.py` | Simule l’ESP32 tilt + écoute `flipper/solenoid/#` (semaine 2) |
| `qos_benchmark.py` | Comparaison débit QoS 0 / 1 / 2 (semaine 5) |
| `stability_run.py` | Charge et taux de perte (semaines 4 & 8) |
| `monitor_sys.py` | Topics `$SYS` Mosquitto (semaine 7) |
| `publish_solenoid_sample.py` | Exemple commande solénoïde JSON compact (semaine 6) |
| `esp32_button_daemon.py` | Lit le contrôleur boutons ESP32 en USB série et peut envoyer des touches sur macOS, Windows et Linux |

Exemples :

```bash
python iot/scripts/publish_hello.py --host 127.0.0.1
python iot/scripts/fake_esp32_publisher.py --cycles 3 --interval 1
python iot/scripts/stability_run.py --duration 15 --rate 40
python iot/scripts/monitor_sys.py --seconds 5
python iot/scripts/esp32_button_daemon.py --list-ports
```

## Contrôleur boutons ESP32

Le firmware du contrôleur joueur se trouve ici :

```text
iot/firmware/esp32_button_controller/esp32_button_controller.ino
```

La documentation de câblage, de mapping GPIO et d'utilisation sur ordinateur est
dans `iot/ESP32_Button_Controller.md`.

## Standardisation des topics

- `topic_registry.json` : registre versionné (JSON), aligné sur `doc/Hardware_Architecture.md`.
- Les topics réels solénoïdes / tilt / LED restent ceux du document hardware (source de vérité).

## Windows (Mosquitto natif)

Si tu utilises le service Windows plutôt que Docker, adapte `--host` si le broker est sur une autre machine ; les mêmes scripts fonctionnent.
