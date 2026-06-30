# Lancement automatique Linux du flipper

Ce document explique comment lancer le projet sur la machine Linux du flipper
physique sans taper manuellement la commande du daemon ESP32.

## Principe

Le script Linux démarre :

- les services Docker du projet ;
- le daemon ESP32 uniquement si `FLIPPER_BUTTON_SOURCE=esp32` ;
- le navigateur sur le flipper quand aucun kiosque externe ne le gère.

Sur le flipper physique, le contrôleur ESP32 est détecté automatiquement, le daemon convertit ses événements en touches clavier et le kiosque existant charge les trois URLs `?screen=...`.

## Prérequis

- Linux avec session graphique ;
- session graphique X11 recommandée pour l'envoi des touches clavier ;
- Docker et Docker Compose ;
- Python 3 avec `venv` ;
- navigateur installé : Chromium, Chrome ou Firefox ;
- ESP32 branché en USB ;
- droits d'accès au port série.

Si le port série n'est pas accessible, ajouter l'utilisateur au groupe `dialout`
puis redémarrer la session :

```bash
sudo usermod -aG dialout "$USER"
```

## Installation dans `/opt/flipper`

Sur la machine finale, le chemin recommandé est `/opt/flipper`.

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/AkaTFL/Flipper.git flipper
sudo chown -R "$USER:$USER" /opt/flipper
cd /opt/flipper
git checkout integration/flipper-physique
```

## Lancement manuel par terminal

Depuis la racine du projet :

```bash
chmod +x scripts/linux/start_flipper.sh scripts/linux/stop_flipper.sh
./scripts/linux/start_flipper.sh
```

Sur la machine physique avec son kiosque déjà configuré :

```bash
FLIPPER_MANAGED_KIOSK=1 FLIPPER_BUTTON_SOURCE=esp32 ./scripts/linux/start_flipper.sh
```

Le raccourci `flipper.desktop` et le service `flipper.service` utilisent déjà ces deux variables. Si l'ESP32 est absent, inaccessible ou si son daemon s'arrête au démarrage, le lancement échoue avec un message et le chemin du fichier de log.

Pour tester avec un ESP32 externe :

```bash
FLIPPER_BUTTON_SOURCE=esp32 ./scripts/linux/start_flipper.sh
```

En développement, le mode automatique utilise l'ESP32 s'il est détecté et revient au clavier sinon :

```bash
FLIPPER_BUTTON_SOURCE=auto ./scripts/linux/start_flipper.sh
```

Pour arrêter :

```bash
./scripts/linux/stop_flipper.sh
```

Les logs du daemon sont écrits ici :

```text
.flipper-run/esp32_button_daemon.log
```

## Lancement par double clic

Si le projet est installé dans `/opt/flipper`, le fichier
`scripts/linux/flipper.desktop` peut servir de raccourci.

Copier le raccourci sur le bureau :

```bash
cp /opt/flipper/scripts/linux/flipper.desktop ~/Bureau/Flipper.desktop
chmod +x ~/Bureau/Flipper.desktop
```

Si le dossier du bureau s'appelle `Desktop` :

```bash
cp /opt/flipper/scripts/linux/flipper.desktop ~/Desktop/Flipper.desktop
chmod +x ~/Desktop/Flipper.desktop
```

Au premier lancement, Linux peut demander d'autoriser le raccourci. Choisir
`Faire confiance et lancer` ou `Allow Launching` selon l'environnement.

Le double clic lance :

```text
/opt/flipper/scripts/linux/start_flipper.sh
```

## Mode kiosque

Pour ouvrir le navigateur en plein écran :

```bash
FLIPPER_KIOSK=1 ./scripts/linux/start_flipper.sh
```

## Démarrage automatique avec systemd

Le fichier `scripts/linux/flipper.service` sert de modèle.

Exemple avec le projet installé dans `/opt/flipper` :

```bash
sudo cp scripts/linux/flipper.service /etc/systemd/user/flipper.service
systemctl --user daemon-reload
systemctl --user enable flipper.service
systemctl --user start flipper.service
```

Si le projet n'est pas installé dans `/opt/flipper`, modifier `WorkingDirectory`,
`ExecStart` et `ExecStop` dans le fichier service avant de l'activer.

Pour que le service utilisateur puisse démarrer sans terminal ouvert :

```bash
loginctl enable-linger "$USER"
```

## Démarrage automatique avec la session graphique

Pour une machine avec écran et navigateur, le démarrage par fichier `.desktop`
est souvent plus simple que `systemd`, car il démarre dans la session graphique
de l'utilisateur.

Exemple avec le projet installé dans `/opt/flipper` :

```bash
mkdir -p ~/.config/autostart
cp scripts/linux/flipper.desktop ~/.config/autostart/flipper.desktop
```

Si le projet n'est pas installé dans `/opt/flipper`, modifier la ligne `Exec`
dans le fichier `.desktop`.

Au prochain login, le script `start_flipper.sh` sera lancé automatiquement.

## Vérifications

Le jeu doit être accessible sur :

```text
http://localhost:3001
```

Les URLs du kiosque physique restent disponibles :

```text
http://localhost:32789/?screen=flipper
http://localhost:32789/?screen=backglass
http://localhost:32789/?screen=dmd
```

Le routeur redirige automatiquement chaque écran vers le Flipper, le Backglass ou le DMD. Le Backglass affiche les derniers boutons pressés et relâchés pour faciliter le test du matériel.

Avant la première installation sur le flipper, vérifier quel service utilise déjà la porte `32789` :

```bash
sudo ss -ltnp | grep 32789
```

Si l'écran de debug du flipper occupe encore cette porte, il doit être arrêté ou reconfiguré avant le lancement du conteneur `frontend_kiosk`. Cette vérification ne peut être réalisée que sur la machine physique.

Le daemon doit afficher les événements des boutons dans le fichier de log :

```text
APPUI button_white_left -> x
RELACHE button_white_left -> x
APPUI plunger -> d
RELACHE plunger -> d
```

## Notes

- Les boutons restent en USB série pour garder une latence faible.
- MQTT reste utilisé pour les solénoïdes, le tilt et les événements non critiques.
- Si l'ESP32 n'est pas trouvé, lancer :

```bash
python iot/scripts/esp32_button_daemon.py --list-ports
```
