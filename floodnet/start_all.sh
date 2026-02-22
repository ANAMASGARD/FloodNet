#!/bin/bash
echo "=============================================="
echo " FloodNet Multi-Agent System"
echo " Powered by ZyndAI + LangChain + Gemini"
echo "=============================================="
echo ""
echo "Starting FloodNet agents on Zynd network..."
echo ""

cd "$(dirname "$0")"

echo "[1/5] Starting Flood Predictor (port 5001)..."
python agent_1_flood_predictor.py &
sleep 2

echo "[2/5] Starting Zone Mapper (port 5002)..."
python agent_2_zone_mapper.py &
sleep 2

echo "[3/5] Starting Rescue Planner (port 5003)..."
python agent_3_rescue_planner.py &
sleep 2

echo "[4/5] Starting Alert Dispatcher (port 5004, PAID)..."
python agent_4_alert_dispatcher.py &
sleep 3

echo "[5/5] Starting Coordinator (port 5000)..."
echo "       (This is the main entry point)"
python agent_5_coordinator.py &
sleep 2

echo ""
echo "=============================================="
echo " FloodNet: All 5 agents running!"
echo "=============================================="
echo " Agent 1 - Flood Predictor:   http://localhost:5001"
echo " Agent 2 - Zone Mapper:       http://localhost:5002"
echo " Agent 3 - Rescue Planner:    http://localhost:5003"
echo " Agent 4 - Alert Dispatcher:  http://localhost:5004 (PAID)"
echo " Agent 5 - Coordinator:       http://localhost:5000"
echo "=============================================="
echo " All agents registered on Zynd decentralized registry"
echo "=============================================="
echo ""
echo "Press Ctrl+C to stop all agents"

wait
