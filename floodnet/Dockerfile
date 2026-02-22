# FloodNet: all 5 Zynd AI agents in one image
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code (no .env or .agent-* — use env vars at runtime)
COPY agent_1_flood_predictor.py \
     agent_2_zone_mapper.py \
     agent_3_rescue_planner.py \
     agent_4_alert_dispatcher.py \
     agent_5_coordinator.py \
     start.sh .

RUN chmod +x start.sh

# Railway sets PORT; coordinator listens on it. Other agents use 5001–5004 inside the container.
ENV BASE_AGENT_HOST=http://localhost

EXPOSE 5000
# Use PORT at runtime (Railway injects it)
CMD ["./start.sh"]
