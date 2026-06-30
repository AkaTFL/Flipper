#!/usr/bin/env python3
"""Semaine 5 — mesure du débit selon le niveau QoS (réseau local / broker)."""
import argparse
import json
import sys
import time

import paho.mqtt.client as mqtt


def run_batch(host: str, port: int, qos: int, count: int, topic: str) -> float:
    done = {"n": 0}

    def on_message(_c, _u, _m):
        done["n"] += 1

    sub = mqtt.Client(client_id=f"qos_sub_{qos}_{int(time.time())}", protocol=mqtt.MQTTv311)
    sub.on_message = on_message
    sub.connect(host, port, keepalive=30)
    sub.subscribe(topic, qos=qos)
    sub.loop_start()
    time.sleep(0.3)

    pub = mqtt.Client(client_id=f"qos_pub_{qos}_{int(time.time())}", protocol=mqtt.MQTTv311)
    pub.connect(host, port, keepalive=30)
    pub.loop_start()
    time.sleep(0.2)

    payload = json.dumps({"k": 0})
    t0 = time.perf_counter()
    for i in range(count):
        payload = json.dumps({"k": i})
        inf = pub.publish(topic, payload, qos=qos)
        inf.wait_for_publish(timeout=10.0)
    t1 = time.perf_counter()

    deadline = time.perf_counter() + 30.0
    while done["n"] < count and time.perf_counter() < deadline:
        time.sleep(0.05)

    pub.loop_stop()
    pub.disconnect()
    sub.loop_stop()
    sub.disconnect()
    elapsed = t1 - t0
    return elapsed


def main() -> int:
    p = argparse.ArgumentParser(description="Benchmark QoS MQTT")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--count", type=int, default=200)
    p.add_argument("--topic", default="playfield/debug/qos_bench")
    args = p.parse_args()

    topic = args.topic
    print(f"Broker {args.host}:{args.port} — topic {topic} — {args.count} messages\n")

    for qos in (0, 1, 2):
        try:
            elapsed = run_batch(args.host, args.port, qos, args.count, topic)
            rate = args.count / elapsed if elapsed > 0 else 0
            print(f"QoS {qos}: {elapsed:.3f}s — {rate:.1f} msg/s")
        except Exception as e:
            print(f"QoS {qos}: ERREUR {e}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
