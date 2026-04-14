#!/usr/bin/env python3
"""Semaine 6 — exemple de payload compact pour commande solénoïde (optimisation / format)."""
import argparse
import json
import sys
import time

import paho.mqtt.client as mqtt

# Payload minimal aligné doc/Hardware_Architecture.md
SOLENOID_SAMPLE = {
    "topic": "flipper/solenoid/back_left",
    "payload": {"action": "activate", "duration_ms": 50},
}


def main() -> int:
    p = argparse.ArgumentParser(description="Publie une commande solénoïde type production")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--topic", default=SOLENOID_SAMPLE["topic"])
    args = p.parse_args()

    body = json.dumps(SOLENOID_SAMPLE["payload"], separators=(",", ":"))
    client = mqtt.Client(client_id="flipper_pub_solenoid", protocol=mqtt.MQTTv311)
    try:
        client.connect(args.host, args.port, keepalive=10)
        client.loop_start()
        inf = client.publish(args.topic, body, qos=1, retain=False)
        inf.wait_for_publish(timeout=5.0)
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"ERREUR: {e}", file=sys.stderr)
        return 1
    print(f"OK {args.topic} ({len(body)} octets): {body}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
