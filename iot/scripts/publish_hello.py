#!/usr/bin/env python3
"""Semaine 1 — publication MQTT minimale (test broker)."""
import argparse
import json
import sys
import time

import paho.mqtt.client as mqtt


def main() -> int:
    p = argparse.ArgumentParser(description="Publication simple flipper/debug/ping")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--topic", default="flipper/debug/ping")
    args = p.parse_args()

    payload = json.dumps({"ts": time.time(), "source": "publish_hello.py"})
    client = mqtt.Client(client_id="flipper_pub_hello", protocol=mqtt.MQTTv311)
    try:
        client.connect(args.host, args.port, keepalive=10)
        client.loop_start()
        inf = client.publish(args.topic, payload, qos=0, retain=False)
        inf.wait_for_publish(timeout=5.0)
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"ERREUR: {e}", file=sys.stderr)
        return 1
    print(f"OK publié sur {args.topic}: {payload}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
