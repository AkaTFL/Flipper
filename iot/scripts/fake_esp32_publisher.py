#!/usr/bin/env python3
"""
Semaine 2 (substitut matériel) — client MQTT type ESP32 #3 (tilt via Wi-Fi).

Publie sur les topics documentés ; s'abonne aux commandes solénoïdes pour
vérifier le chemin serveur → IoT sans GPIO réels.
"""
import argparse
import json
import random
import sys
import time

import paho.mqtt.client as mqtt


def main() -> int:
    p = argparse.ArgumentParser(description="Simulateur ESP32 MQTT (tilt + écoute solénoïdes)")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--interval", type=float, default=3.0, help="Secondes entre publications tilt")
    p.add_argument("--cycles", type=int, default=0, help="0 = boucle infinie")
    args = p.parse_args()

    received = []

    def on_connect(client, _userdata, _flags, rc):
        if rc != 0:
            print(f"Connexion refusée rc={rc}", file=sys.stderr)
            return
        print("Connecté au broker (simulation ESP32)")
        client.subscribe("playfield/solenoid/#", qos=1)

    def on_message(_client, _userdata, msg):
        received.append((msg.topic, msg.payload.decode("utf-8", errors="replace")))
        print(f"[RX solénoïde] {msg.topic}: {msg.payload!r}")

    client = mqtt.Client(client_id=f"playfield_fake_esp_{random.randint(1000,9999)}", protocol=mqtt.MQTTv311)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(args.host, args.port, keepalive=30)
        client.loop_start()
        for _ in range(100):
            if client.is_connected():
                break
            time.sleep(0.05)
        else:
            print("Timeout: pas de connexion broker", file=sys.stderr)
            return 1
        time.sleep(0.2)
    except Exception as e:
        print(f"ERREUR connexion: {e}", file=sys.stderr)
        return 1

    n = 0
    try:
        while True:
            warn = json.dumps({"level": 1, "acceleration": round(1.5 + random.random(), 2)})
            client.publish("playfield/sensor/tilt/warning", warn, qos=1)
            print(f"Pub tilt/warning: {warn}")
            time.sleep(args.interval)
            n += 1
            if args.cycles and n >= args.cycles:
                break
    except KeyboardInterrupt:
        print("Interruption utilisateur")
    finally:
        client.loop_stop()
        client.disconnect()

    print(f"Fin — messages solénoïde reçus: {len(received)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
