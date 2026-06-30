#!/usr/bin/env python3
"""Semaine 7 — lecture des topics $SYS du broker Mosquitto (monitoring léger)."""
import argparse
import sys
import time

import paho.mqtt.client as mqtt


def main() -> int:
    p = argparse.ArgumentParser(description="Souscription $SYS Mosquitto (quelques secondes)")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--seconds", type=float, default=5.0)
    args = p.parse_args()

    interesting = (
        "publish/messages/received",
        "publish/messages/sent",
        "bytes/received",
        "bytes/sent",
        "uptime",
        "clients/connected",
    )

    def on_connect(client, _u, _f, rc):
        if rc != 0:
            print(f"Connexion rc={rc}", file=sys.stderr)
            return
        client.subscribe("$SYS/broker/#")

    def on_message(_c, _u, msg):
        tail = msg.topic.replace("$SYS/broker/", "")
        if any(k in tail for k in interesting):
            try:
                val = msg.payload.decode("utf-8")
            except Exception:
                val = repr(msg.payload)
            print(f"{msg.topic} = {val}")

    client = mqtt.Client(client_id=f"flipper_monitor_{int(time.time())}", protocol=mqtt.MQTTv311)
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(args.host, args.port, keepalive=20)
        client.loop_start()
        time.sleep(args.seconds)
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"ERREUR: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
