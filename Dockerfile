# FloodNet agents — single image for Railway (build from repo root so Railway uses this, not Railpack)
FROM python:3.12-slim

WORKDIR /app

# Copy and install Python deps from floodnet/
COPY floodnet/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code, proxy, and start script
COPY floodnet/agent_1_flood_predictor.py \
     floodnet/agent_2_zone_mapper.py \
     floodnet/agent_3_rescue_planner.py \
     floodnet/agent_4_alert_dispatcher.py \
     floodnet/agent_5_coordinator.py \
     floodnet/webhook_proxy.py \
     floodnet/start.sh .

# Copy persistent agent identity configs (same seed/DID per agent = one registry entry per agent, no duplicates on redeploy)
COPY floodnet/.agent-flood-predictor .agent-flood-predictor
COPY floodnet/.agent-zone-mapper .agent-zone-mapper
COPY floodnet/.agent-rescue-planner .agent-rescue-planner
COPY floodnet/.agent-alert-dispatcher .agent-alert-dispatcher
COPY floodnet/.agent-coordinator .agent-coordinator

RUN chmod +x start.sh

ENV BASE_AGENT_HOST=http://localhost
EXPOSE 5000
CMD ["./start.sh"]
