"""
FloodNet Agent 2: Zone Mapper
Port: 5002 | Price: $0

Maps flood risk zones, finds shelters and hospitals.
Returns heatmap_points for Mapbox visualization.
"""

from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from dotenv import load_dotenv
import os

load_dotenv()


@tool
def get_river_discharge_for_zones(lat: float, lng: float) -> str:
    """Get river discharge to compute heatmap intensities. No API key needed."""
    import httpx
    r = httpx.get(
        "https://flood-api.open-meteo.com/v1/flood",
        params={
            "latitude": lat,
            "longitude": lng,
            "daily": "river_discharge",
            "forecast_days": 7,
        },
        timeout=10,
    )
    return str(r.json())


@tool
def find_safe_shelters(lat: float, lng: float) -> str:
    """Find safe evacuation shelters within 8km using Google Places API.
    Searches for: community hall, school, shelter, relief camp.
    Returns name, address, lat, lng, rating for each."""
    import httpx
    r = httpx.get(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
        params={
            "location": f"{lat},{lng}",
            "radius": 8000,
            "keyword": "community hall shelter school relief camp",
            "key": os.environ["GOOGLE_PLACE_API_KEY"],
        },
        timeout=10,
    )
    return str(r.json())


@tool
def find_hospitals(lat: float, lng: float) -> str:
    """Find hospitals and emergency medical facilities within 6km
    using Google Places API. Returns name, address, lat, lng, open_now for each."""
    import httpx
    r = httpx.get(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
        params={
            "location": f"{lat},{lng}",
            "radius": 6000,
            "type": "hospital",
            "key": os.environ["GOOGLE_PLACE_API_KEY"],
        },
        timeout=10,
    )
    return str(r.json())


@tool
def get_current_weather(lat: float, lng: float) -> str:
    """Get current weather conditions using OpenWeatherMap API.
    Returns: temperature, humidity, wind speed, rainfall mm/hr, description."""
    import httpx
    r = httpx.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={
            "lat": lat,
            "lon": lng,
            "appid": os.environ["OPENWEATHER_API_KEY"],
            "units": "metric",
        },
        timeout=10,
    )
    return str(r.json())


SYSTEM_PROMPT = """You are FloodNet Zone Mapper.
You receive: {{"lat": float, "lng": float, "risk_level": str}}

Call ALL 4 tools: get_river_discharge_for_zones, find_safe_shelters, find_hospitals, get_current_weather.

Generate heatmap_points (MINIMUM 8 points) using this method:
Create a grid from input lat/lng using offsets:
[-0.015, -0.010, -0.005, 0, +0.005, +0.010, +0.015]
For each grid point compute intensity:
base = river_discharge_max: >1000→0.95, >500→0.80, >200→0.60, else→0.40
if rainfall_mm > 50: base = min(base + 0.15, 1.0)
if rainfall_mm > 25: base = min(base + 0.08, 1.0)
Points closer to center = higher intensity.

Always create exactly 3 flood_risk_zones:
- CRITICAL: radius 1500m centered on input lat/lng
- HIGH: radius 3000m centered on input lat/lng
- MEDIUM: radius 6000m centered on input lat/lng

For safe_shelters: use REAL results from find_safe_shelters tool.
For critical_infra: use REAL results from find_hospitals tool.
Set at_risk=true if hospital is within 3km of center.

Return ONLY this JSON (no markdown):
{{
  "agent": "floodnet-zone-mapper",
  "heatmap_points": [
    {{"lat": float, "lng": float, "intensity": float}},
    ... minimum 8 entries ...
  ],
  "flood_risk_zones": [
    {{
      "zone_id": str,
      "name": str,
      "severity": "CRITICAL|HIGH|MEDIUM",
      "center_lat": float,
      "center_lng": float,
      "radius_meters": int,
      "estimated_population": int,
      "reason": str
    }}
  ],
  "safe_shelters": [
    {{
      "name": str, "address": str,
      "lat": float, "lng": float,
      "distance_km": float, "type": str
    }}
  ],
  "critical_infra": [
    {{
      "type": "hospital", "name": str,
      "lat": float, "lng": float,
      "address": str, "at_risk": bool, "open_now": bool
    }}
  ],
  "weather_current": {{
    "temp_c": float, "rainfall_mm_1h": float,
    "humidity_pct": int, "wind_speed_kmh": float,
    "description": str
  }},
  "summary": str,
  "status": "ok"
}}"""


def create_agent():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.environ["GEMINI_API_KEY"],
        temperature=0,
    )

    tools = [get_river_discharge_for_zones, find_safe_shelters, find_hospitals, get_current_weather]

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True)


if __name__ == "__main__":
    # Public URL so Zynd registry can reach this agent (ACTIVE) when deployed on Railway
    webhook_url = None
    if os.environ.get("RAILWAY_PUBLIC_DOMAIN"):
        webhook_url = f"https://{os.environ['RAILWAY_PUBLIC_DOMAIN']}/mapper/webhook"
    elif os.environ.get("PUBLIC_WEBHOOK_URL"):
        base = os.environ["PUBLIC_WEBHOOK_URL"].rstrip("/")
        webhook_url = f"{base}/mapper/webhook"

    agent_config = AgentConfig(
        name="floodnet-zone-mapper",
        description="Maps flood risk zones, finds shelters and hospitals. Returns heatmap_points for Mapbox visualization.",
        capabilities={
            "ai": ["nlp"],
            "protocols": ["http"],
            "services": ["zone-mapping", "shelter-finder", "heatmap-generation"],
            "domains": ["flood", "mapping", "evacuation"],
        },
        webhook_host="0.0.0.0",
        webhook_port=int(os.environ.get("PORT", "5002")),
        webhook_url=webhook_url,
        registry_url="https://registry.zynd.ai",
        price="$0",
        api_key=os.environ["ZYND_API_KEY"],
        config_dir=".agent-zone-mapper",
    )

    zynd_agent = ZyndAIAgent(agent_config=agent_config)

    agent_executor = create_agent()
    zynd_agent.set_langchain_agent(agent_executor)

    def message_handler(message: AgentMessage, topic: str):
        import traceback

        print(f"\n{'='*60}")
        print(f"[Zone Mapper] Received: {message.content}")
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
    print("FloodNet Agent 2: Zone Mapper")
    print(f"Port: 5002")
    print(f"Webhook: {zynd_agent.webhook_url}")
    print(f"Agent ID: {zynd_agent.agent_id}")
    print(f"Zynd Registration: Active")
    print("=" * 60)
    print("\nType 'exit' to quit\n")

    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
