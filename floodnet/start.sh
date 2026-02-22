#!/bin/sh
set -e

# Start agents 1–4 in background on fixed ports (coordinator calls them at localhost)
PORT=5001 python agent_1_flood_predictor.py &
PORT=5002 python agent_2_zone_mapper.py &
PORT=5003 python agent_3_rescue_planner.py &
PORT=5004 python agent_4_alert_dispatcher.py &

sleep 5

# Coordinator on 5005; proxy listens on Railway PORT so all 5 are reachable publicly (Zynd ACTIVE)
PORT=5005 python agent_5_coordinator.py &

sleep 3

# Proxy exposes /webhook (coordinator), /predictor/webhook, /mapper/webhook, /planner/webhook, /alert/webhook
exec python webhook_proxy.py
