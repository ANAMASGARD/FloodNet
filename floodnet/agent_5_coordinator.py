"""
FloodNet Agent 5: Coordinator (Master Orchestrator)
Port: 5000 | Price: $0

Master orchestrator for FloodNet. Discovers and coordinates
all flood resilience agents via the Zynd decentralized registry.
This is the main entry point for the entire system.
"""

from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from dotenv import load_dotenv
import json
import os

load_dotenv()


def _agent_fallback(port: int, url_env: str) -> str:
    """Fallback URL: use URL_ENV if set (Railway), else BASE_AGENT_HOST:port."""
    full = os.environ.get(url_env)
    if full:
        return full.rstrip("/")
    base = os.environ.get("BASE_AGENT_HOST", "http://localhost")
    return f"{base.rstrip('/')}:{port}"


def search_and_call(query: str, payload: dict, fallback_url: str) -> dict:
    """Search Zynd registry for an agent matching query.
    Calls the first result's webhook URL with payload.
    Falls back to fallback_url if Zynd search fails."""
    import httpx
    try:
        search_r = httpx.get(
            "https://registry.zynd.ai/agents/search",
            params={"q": query, "limit": 1},
            headers={"Authorization": f"Bearer {os.environ['ZYND_API_KEY']}"},
            timeout=5,
        )
        agents = search_r.json().get("agents", [])
        endpoint = agents[0]["endpoint"] if agents else fallback_url
    except Exception:
        endpoint = fallback_url

    sync_url = endpoint.rstrip("/")
    if "/webhook/sync" not in sync_url:
        if sync_url.endswith("/webhook"):
            sync_url = sync_url + "/sync"
        else:
            sync_url = sync_url + "/webhook/sync"

    msg = AgentMessage(
        content=json.dumps(payload),
        sender_id="floodnet-coordinator",
        message_type="query",
    )

    r = httpx.post(sync_url, json=msg.to_dict(), timeout=60)
    return r.json()


@tool
def call_flood_predictor(lat: float, lng: float) -> str:
    """Search Zynd registry for flood prediction agent.
    Calls it with lat/lng to get risk_level, max_rain_mm,
    river_discharge, and 3-day forecast.
    This is a real Zynd network discovery call."""
    result = search_and_call(
        query="flood prediction rainfall river discharge",
        payload={"lat": lat, "lng": lng},
        fallback_url=_agent_fallback(5001, "PREDICTOR_URL"),
    )
    return str(result)


@tool
def call_zone_mapper(lat: float, lng: float, risk_level: str) -> str:
    """Search Zynd registry for zone mapping agent.
    Calls it to get heatmap_points (for Mapbox), safe_shelters,
    and critical_infra. Only call if risk is MEDIUM, HIGH, or CRITICAL."""
    result = search_and_call(
        query="flood zone mapping shelters heatmap google places",
        payload={"lat": lat, "lng": lng, "risk_level": risk_level},
        fallback_url=_agent_fallback(5002, "MAPPER_URL"),
    )
    return str(result)


@tool
def call_rescue_planner(lat: float, lng: float, shelters_json: str) -> str:
    """Search Zynd registry for rescue route planner agent.
    Calls it to get evacuation route with real traffic ETA and Mapbox polyline.
    shelters_json: JSON string of safe_shelters list.
    Only call if risk is HIGH or CRITICAL or intent is evacuation."""
    shelters = json.loads(shelters_json) if isinstance(shelters_json, str) else shelters_json
    result = search_and_call(
        query="evacuation rescue route planner traffic ETA",
        payload={"lat": lat, "lng": lng, "safe_shelters": shelters},
        fallback_url=_agent_fallback(5003, "PLANNER_URL"),
    )
    return str(result)


@tool
def call_alert_dispatcher(
    language: str,
    risk_json: str,
    zones_json: str,
    routes_json: str,
    user_query: str,
) -> str:
    """Search Zynd registry for alert dispatcher agent.
    This is a PAID agent (0.001 USDC via x402).
    Calls it to get multilingual flood alerts and summary.
    Always call this last after all other agents.
    language: 'en', 'hi', or 'mixed'"""
    import httpx

    try:
        search_r = httpx.get(
            "https://registry.zynd.ai/agents/search",
            params={"q": "flood alert multilingual dispatcher paid", "limit": 1},
            headers={"Authorization": f"Bearer {os.environ['ZYND_API_KEY']}"},
            timeout=5,
        )
        agents_found = search_r.json().get("agents", [])
        endpoint = agents_found[0]["endpoint"] if agents_found else _agent_fallback(5004, "ALERT_DISPATCHER_URL")
    except Exception:
        endpoint = _agent_fallback(5004, "ALERT_DISPATCHER_URL")

    sync_url = endpoint.rstrip("/")
    if "/webhook/sync" not in sync_url:
        if sync_url.endswith("/webhook"):
            sync_url = sync_url + "/sync"
        else:
            sync_url = sync_url + "/webhook/sync"

    payload = {
        "language": language,
        "risk": json.loads(risk_json) if isinstance(risk_json, str) else risk_json,
        "zones": json.loads(zones_json) if isinstance(zones_json, str) else zones_json,
        "routes": json.loads(routes_json) if isinstance(routes_json, str) else routes_json,
        "user_query": user_query,
    }

    msg = AgentMessage(
        content=json.dumps(payload),
        sender_id="floodnet-coordinator",
        message_type="query",
    )

    r = httpx.post(
        sync_url,
        json=msg.to_dict(),
        headers={"X-PAYMENT": "Bearer x402-floodnet-paid"},
        timeout=60,
    )
    return str(r.json())


SYSTEM_PROMPT = """You are FloodNet Coordinator — master orchestrator of the FloodNet multi-agent flood resilience network on Zynd.

You receive:
{{
  "query": str,
  "language": "en|hi|mixed",
  "lat": float,
  "lng": float,
  "intent": "risk_check|evacuation_help|general_info"
}}

ALWAYS follow this exact sequence:

Step 1: Call call_flood_predictor(lat, lng)
        Save result as predictor_result.

Step 2: If risk_level in ["MEDIUM","HIGH","CRITICAL"]:
        Call call_zone_mapper(lat, lng, risk_level)
        Save as zone_result. Extract safe_shelters.

Step 3: If risk_level in ["HIGH","CRITICAL"] OR intent == "evacuation_help":
        Call call_rescue_planner(lat, lng, JSON string of safe_shelters from step 2)
        Save as rescue_result.

Step 4: ALWAYS call call_alert_dispatcher(
          language=language,
          risk_json=predictor_result as JSON string,
          zones_json=zone_result as JSON string,
          routes_json=rescue_result as JSON string,
          user_query=query
        )

RULES:
- NEVER skip call_flood_predictor or call_alert_dispatcher
- NEVER use your own knowledge for coordinates, ETAs, rainfall
- If zone_mapper not called, use empty arrays for shelters/zones
- If rescue_planner not called, set primary_route to null
- agents_called must list every tool you actually invoked

Return ONLY this JSON (no markdown, no extra text):
{{
  "status": "ok",
  "risk_level": str,
  "max_rain_mm": float,
  "peak_time": str or null,
  "heatmap_points": [...or []...],
  "flood_risk_zones": [...or []...],
  "safe_shelters": [...or []...],
  "evacuation_recommended": bool,
  "primary_route": {{...or null...}},
  "alerts": [...],
  "coordinator_summary": str,
  "agents_called": [str, ...],
  "zynd_network": {{
    "agents_discovered_via_zynd": int,
    "paid_agent_used": true
  }},
  "agent": "floodnet-coordinator"
}}"""


def create_agent():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.environ["GEMINI_API_KEY"],
        temperature=0,
    )

    tools = [call_flood_predictor, call_zone_mapper, call_rescue_planner, call_alert_dispatcher]

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=10)


if __name__ == "__main__":
    # Use public URL for Zynd registry when deployed (e.g. Railway) so the agent shows ACTIVE.
    # Without this, the SDK registers localhost:PORT and Zynd cannot reach the webhook.
    webhook_url = None
    if os.environ.get("RAILWAY_PUBLIC_DOMAIN"):
        webhook_url = f"https://{os.environ['RAILWAY_PUBLIC_DOMAIN']}/webhook"
    elif os.environ.get("PUBLIC_WEBHOOK_URL"):
        base = os.environ["PUBLIC_WEBHOOK_URL"].rstrip("/")
        webhook_url = f"{base}/webhook"

    agent_config = AgentConfig(
        name="floodnet-coordinator",
        description="Master orchestrator for FloodNet. Discovers and coordinates all flood resilience agents via the Zynd decentralized registry.",
        capabilities={
            "ai": ["nlp"],
            "protocols": ["http"],
            "services": ["orchestration", "multi-agent-coordination"],
            "domains": ["flood", "coordinator", "emergency"],
        },
        webhook_host="0.0.0.0",
        webhook_port=int(os.environ.get("PORT", "5000")),
        webhook_url=webhook_url,
        registry_url="https://registry.zynd.ai",
        price="$0",
        api_key=os.environ["ZYND_API_KEY"],
        config_dir=".agent-coordinator",
    )

    zynd_agent = ZyndAIAgent(agent_config=agent_config)

    agent_executor = create_agent()
    zynd_agent.set_langchain_agent(agent_executor)

    def message_handler(message: AgentMessage, topic: str):
        import traceback

        print(f"\n{'='*60}")
        print(f"[Coordinator] Received: {message.content}")
        print(f"{'='*60}\n")

        try:
            response = zynd_agent.invoke(message.content, chat_history=[])
            print(f"\nResponse: {response}\n")
            zynd_agent.set_response(message.message_id, response)
        except Exception as e:
            print(f"ERROR: {e}")
            print(traceback.format_exc())
            zynd_agent.set_response(message.message_id, f"Error: {str(e)}")

    zynd_agent.add_message_handler(message_handler)

    print("\n" + "=" * 60)
    print("FloodNet Agent 5: Coordinator (Master Orchestrator)")
    print(f"Port: 5000")
    print(f"Webhook: {zynd_agent.webhook_url}")
    print(f"Agent ID: {zynd_agent.agent_id}")
    print(f"Zynd Registration: Active")
    print(f"Agents in Network: flood-predictor, zone-mapper, rescue-planner, alert-dispatcher")
    print("=" * 60)
    print("\nType 'exit' to quit\n")

    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
