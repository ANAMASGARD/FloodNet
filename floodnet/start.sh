#!/bin/sh
set -e

# Start agents 1–4 in background on fixed ports (coordinator will call them at localhost)
PORT=5001 python agent_1_flood_predictor.py &
PORT=5002 python agent_2_zone_mapper.py &
PORT=5003 python agent_3_rescue_planner.py &
PORT=5004 python agent_4_alert_dispatcher.py &

# Give them a moment to bind
sleep 5

# Coordinator runs in foreground and listens on $PORT (set by Railway)
exec python agent_5_coordinator.py
