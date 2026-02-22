"""
FloodNet Agent 3: Rescue Planner
Port: 5003 | Price: $0

Plans evacuation routes with real traffic-aware ETA
using Google Routes API.
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
def get_evacuation_route(
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
) -> str:
    """Get real traffic-aware driving route using Google Routes API.
    Returns ETA in minutes, distance in km, encoded polyline for Mapbox.
    Uses TRAFFIC_AWARE routing for realistic flood-time ETA."""
    import httpx
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": os.environ["GOOGLE_PLACE_API_KEY"],
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline",
    }
    body = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": origin_lat,
                    "longitude": origin_lng,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": dest_lat,
                    "longitude": dest_lng,
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
    }
    r = httpx.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        json=body,
        headers=headers,
        timeout=10,
    )
    data = r.json()
    route = data.get("routes", [{}])[0]
    duration_s = int(route.get("duration", "0s").replace("s", ""))
    return str({
        "eta_minutes": round(duration_s / 60),
        "distance_km": round(route.get("distanceMeters", 0) / 1000, 1),
        "polyline": route.get("polyline", {}).get("encodedPolyline", ""),
        "traffic": (
            "HEAVY" if duration_s > 1800
            else "MODERATE" if duration_s > 900
            else "CLEAR"
        ),
    })


SYSTEM_PROMPT = """You are FloodNet Rescue Planner.
You receive:
{{
  "lat": float,
  "lng": float,
  "safe_shelters": [{{"name":str,"lat":float,"lng":float}}]
}}

Call get_evacuation_route ONCE using:
- origin = input lat/lng (user location)
- destination = safe_shelters[0] lat/lng

CRITICAL: NEVER estimate ETA from your own knowledge.
ONLY use the exact numbers returned by the tool.

Return ONLY this JSON:
{{
  "agent": "floodnet-rescue-planner",
  "evacuation_recommended": true,
  "primary_route": {{
    "shelter_name": str,
    "to_lat": float,
    "to_lng": float,
    "eta_minutes": int,
    "distance_km": float,
    "polyline": str,
    "traffic_condition": "CLEAR|MODERATE|HEAVY"
  }},
  "status": "ok"
}}"""


def create_agent():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.environ["GEMINI_API_KEY"],
        temperature=0,
    )

    tools = [get_evacuation_route]

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True)


if __name__ == "__main__":
    agent_config = AgentConfig(
        name="floodnet-rescue-planner",
        description="Plans evacuation routes with real traffic-aware ETA using Google Routes API",
        capabilities={
            "ai": ["nlp"],
            "protocols": ["http"],
            "services": ["route-planning", "evacuation-routing"],
            "domains": ["flood", "routing", "evacuation"],
        },
        webhook_host="0.0.0.0",
        webhook_port=int(os.environ.get("PORT", "5003")),
        registry_url="https://registry.zynd.ai",
        price="$0",
        api_key=os.environ["ZYND_API_KEY"],
        config_dir=".agent-rescue-planner",
    )

    zynd_agent = ZyndAIAgent(agent_config=agent_config)

    agent_executor = create_agent()
    zynd_agent.set_langchain_agent(agent_executor)

    def message_handler(message: AgentMessage, topic: str):
        import traceback

        print(f"\n{'='*60}")
        print(f"[Rescue Planner] Received: {message.content}")
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
    print("FloodNet Agent 3: Rescue Planner")
    print(f"Port: 5003")
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
