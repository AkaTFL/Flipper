#!/usr/bin/env python3
"""
Lecture du contrôleur ESP32 en USB série.
"""

import argparse
import sys
import time

try:
    import serial
    from serial.tools import list_ports
except ImportError as exc:
    print("pyserial est requis. Lance: pip install -r iot/scripts/requirements.txt", file=sys.stderr)
    raise SystemExit(1) from exc

try:
    import pyautogui
except ImportError:
    pyautogui = None


TOUCHES = {
    "button_black_left": "a",
    "button_white_left": "x",
    "button_front_left_green": "g",
    "button_front_left_yellow": "b",
    "button_front_left_red": "h",
    "button_black_right": "e",
    "button_white_right": "c",
    "button_front_white": "f",
    "plunger": "d",
}

TOUCHES_SPECIALES = {
    "space": " ",
    "return": "enter",
    "enter": "enter",
    "escape": "esc",
    "esc": "esc",
    "tab": "tab",
}

ACTIONS = {
    "APPUI": "APPUI",
    "RELACHE": "RELACHE",
    "PRESS": "APPUI",
    "RELEASE": "RELACHE",
}


def lister_ports() -> list[str]:
    return [port.device for port in list_ports.comports()]


def trouver_port_esp32() -> str | None:
    mots_cles = (
        "usbserial",
        "usbmodem",
        "ttyusb",
        "ttyacm",
        "cp210",
        "ch340",
        "wch",
        "silicon labs",
        "espressif",
        "esp32",
    )

    ports = list(list_ports.comports())
    for port in ports:
        texte = " ".join(
            str(valeur).lower()
            for valeur in (port.device, port.description, port.manufacturer, port.hwid)
            if valeur
        )
        if any(mot in texte for mot in mots_cles):
            return port.device

    if len(ports) == 1:
        return ports[0].device

    return None


def lire_ligne(ligne: str):
    morceaux = ligne.strip().split(maxsplit=1)
    if len(morceaux) != 2:
        return None

    action = ACTIONS.get(morceaux[0].upper())
    nom = morceaux[1].strip()
    if action is None or not nom:
        return None

    return action, nom


def envoyer_touche(action: str, touche: str) -> None:
    if pyautogui is None:
        raise RuntimeError("pyautogui est requis pour le mode --clavier")

    touche = TOUCHES_SPECIALES.get(touche, touche)
    if action == "APPUI":
        pyautogui.keyDown(touche)
    elif action == "RELACHE":
        pyautogui.keyUp(touche)


def ouvrir_serie(port: str, baud: int, timeout: float):
    return serial.Serial(port=port, baudrate=baud, timeout=timeout)


def lancer(args: argparse.Namespace) -> int:
    if args.list_ports:
        ports = lister_ports()
        if not ports:
            print("Aucun port série trouvé")
            return 0
        for port in ports:
            print(port)
        return 0

    port = args.port
    if args.auto_port or not port:
        port = trouver_port_esp32()

    if not port:
        print("Port ESP32 introuvable. Utilise --list-ports pour vérifier.", file=sys.stderr)
        return 2

    touches = dict(TOUCHES)
    for valeur in args.map:
        if "=" not in valeur:
            print(f"Mapping invalide: {valeur!r}. Format attendu: bouton=touche", file=sys.stderr)
            return 2
        bouton, touche = valeur.split("=", 1)
        touches[bouton.strip()] = touche.strip().lower()

    print(f"Ouverture de {port} à {args.baud} bauds")
    if args.clavier:
        if pyautogui is None:
            print("pyautogui manquant. Lance: pip install -r iot/scripts/requirements.txt", file=sys.stderr)
            return 2
        print("Mode clavier activé. Garde la fenêtre du jeu au premier plan.")
    else:
        print("Mode affichage uniquement. Ajoute --clavier pour envoyer les touches.")

    with ouvrir_serie(port, args.baud, args.timeout) as appareil:
        time.sleep(args.ready_delay)
        while True:
            ligne_brute = appareil.readline()
            if not ligne_brute:
                continue

            ligne = ligne_brute.decode("utf-8", errors="replace").strip()
            if not ligne:
                continue

            evenement = lire_ligne(ligne)
            if evenement is None:
                print(ligne)
                continue

            action, nom = evenement
            touche = touches.get(nom)
            if touche is None:
                print(f"{action} {nom} -> non associé")
                continue

            print(f"{action} {nom} -> {touche}")
            if args.clavier:
                envoyer_touche(action, touche)


def construire_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lecture USB série des boutons ESP32 du flipper")
    parser.add_argument("--port", help="Port série, exemple: /dev/cu.usbserial-0001 ou COM3")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--timeout", type=float, default=0.1)
    parser.add_argument("--ready-delay", type=float, default=1.5)
    parser.add_argument("--list-ports", action="store_true", help="Liste les ports série disponibles")
    parser.add_argument("--auto-port", action="store_true", help="Détecte automatiquement le port ESP32")
    parser.add_argument("--clavier", "--keyboard", action="store_true", help="Envoie les touches au système")
    parser.add_argument(
        "--map",
        action="append",
        default=[],
        metavar="BUTTON=KEY",
        help="Change une touche, exemple: --map start=space",
    )
    return parser


def main() -> int:
    parser = construire_parser()
    args = parser.parse_args()
    try:
        return lancer(args)
    except KeyboardInterrupt:
        print("\nArrêt")
        return 0
    except serial.SerialException as exc:
        print(f"Erreur série: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
