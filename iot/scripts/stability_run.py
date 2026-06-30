#!/usr/bin/env python3
"""Semaines 4 & 8 — charge soutenue : publication à cadence fixe, comptage côté abonné."""
import argparse
import json
import sys
import threading
import time

import paho.mqtt.client as mqtt


def main() -> int:
    p = argparse.ArgumentParser(description="Test stabilité MQTT (débit + réception)")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--duration", type=float, default=10.0)
    p.add_argument("--rate", type=float, default=50.0, help="Messages publics par seconde")
    p.add_argument("--qos", type=int, default=1, choices=(0, 1, 2))
    p.add_argument("--topic", default="playfield/debug/stability")
    args = p.parse_args()

    state = {"rx": 0}
    lock = threading.Lock()

    def on_message(_c, _u, _m):
        with lock:
            state["rx"] += 1

    sub = mqtt.Client(client_id=f"stab_sub_{int(time.time()*1000)}", protocol=mqtt.MQTTv311)
    sub.on_message = on_message
    try:
        sub.connect(args.host, args.port, keepalive=60)
        sub.subscribe(args.topic, qos=args.qos)
        sub.loop_start()
        time.sleep(0.2)

        pub = mqtt.Client(client_id=f"stab_pub_{int(time.time()*1000)}", protocol=mqtt.MQTTv311)
        pub.connect(args.host, args.port, keepalive=60)
        pub.loop_start()
        time.sleep(0.2)

        interval = 1.0 / args.rate if args.rate > 0 else 0.1
        t_end = time.perf_counter() + args.duration
        sent = 0
        t0 = time.perf_counter()
        while time.perf_counter() < t_end:
            payload = json.dumps({"i": sent, "t": time.time()})
            pub.publish(args.topic, payload, qos=args.qos)
            sent += 1
            time.sleep(interval)
        t1 = time.perf_counter()

        time.sleep(1.0)
        with lock:
            rx = state["rx"]

        pub.loop_stop()
        pub.disconnect()
        sub.loop_stop()
        sub.disconnect()

        dur = t1 - t0
        loss = max(0, sent - rx)
        print(f"Durée effective ~{dur:.2f}s")
        print(f"Publiés: {sent} — Reçus: {rx} — Perte estimée: {loss} ({100.0*loss/sent:.2f}% si sent>0)")
        if sent > 0 and rx < sent * 0.95:
            print("AVERTISSEMENT: taux de réception < 95%", file=sys.stderr)
            return 2
    except Exception as e:
        print(f"ERREUR: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
