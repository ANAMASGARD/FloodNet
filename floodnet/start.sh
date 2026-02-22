#!/bin/sh
set -e

# So all child processes see the public URL (needed for all 5 to register and show ACTIVE)
export PUBLIC_WEBHOOK_URL
export RAILWAY_PUBLIC_DOMAIN

# Proxy MUST start first so when agents register, Zynd's health check can reach them (all 5 ACTIVE).
python webhook_proxy.py &
PROXY_PID=$!
sleep 6

# Start agents 1–4; give them time to load and register before coordinator (and before Zynd health checks)
PORT=5001 python agent_1_flood_predictor.py &
PORT=5002 python agent_2_zone_mapper.py &
PORT=5003 python agent_3_rescue_planner.py &
PORT=5004 python agent_4_alert_dispatcher.py &

sleep 12

# Coordinator last; by then proxy and specialists are up, so all 5 can be ACTIVE
PORT=5005 python agent_5_coordinator.py &

# Keep container alive (wait on proxy)
wait $PROXY_PID
