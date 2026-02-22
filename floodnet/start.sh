#!/bin/sh
set -e

# Proxy MUST start first so when agents register, Zynd's health check can reach them (all 5 ACTIVE).
# If proxy started last, agents 1–4 registered before proxy was listening → health check failed → INACTIVE.
python webhook_proxy.py &
PROXY_PID=$!
sleep 3

# Now start agents; they register with public URL and Zynd can ping proxy -> agent
PORT=5001 python agent_1_flood_predictor.py &
PORT=5002 python agent_2_zone_mapper.py &
PORT=5003 python agent_3_rescue_planner.py &
PORT=5004 python agent_4_alert_dispatcher.py &

sleep 5

PORT=5005 python agent_5_coordinator.py &

# Keep container alive (wait on proxy)
wait $PROXY_PID
