"""
FloodNet Agent 1: Flood Predictor
Port: 5001 | Price: $0

Predicts flood risk using real rainfall and river discharge data
from Open-Meteo APIs. No API keys needed for weather data.
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
def get_weather_forecast(lat: float, lng: float) -> str:
    """Fetch 3-day rainfall and precipitation forecast from Open-Meteo API
    for given coordinates. Returns daily precipitation_sum (mm) and hourly
    rain data. No API key needed."""
    import httpx
    r = httpx.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lng,
            "hourly": "precipitation,rain",
            "daily": "precipitation_sum,rain_sum",
            "forecast_days": 3,
            "timezone": "Asia/Kolkata",
        },
        timeout=10,
    )
    return str(r.json())


@tool
def get_river_discharge(lat: float, lng: float) -> str:
    """Fetch river discharge (m3/s) forecast from Open-Meteo Flood API
    for the next 7 days. river_discharge > 1000 m3/s = CRITICAL overflow
    risk. No API key needed."""
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


SYSTEM_PROMPT = """You are FloodNet Flood Predictor.
The user sends: {{"lat": float, "lng": float}}

Step 1: Call get_weather_forecast with lat/lng
Step 2: Call get_river_discharge with lat/lng

Compute risk_level:
- precipitation_sum[0] >= 64.5mm OR discharge > 1000 → CRITICAL
- precipitation_sum[0] >= 35.5mm OR discharge > 500  → HIGH
- precipitation_sum[0] >= 15.5mm OR discharge > 200  → MEDIUM
- else → LOW

Return ONLY this exact JSON (no markdown, no explanation):
{{
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "max_rain_mm": <float from precipitation_sum[0]>,
  "max_rain_72h_mm": <float, max of 3 days>,
  "river_discharge_max": <float>,
  "peak_time": <string date or null>,
  "forecast_3days": [
    {{"date": str, "rain_mm": float}},
    {{"date": str, "rain_mm": float}},
    {{"date": str, "rain_mm": float}}
  ],
  "summary": "<1 sentence flood risk summary>",
  "agent": "floodnet-flood-predictor"
}}"""


def create_agent():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.environ["GEMINI_API_KEY"],
        temperature=0,
    )

    tools = [get_weather_forecast, get_river_discharge]

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
        name="floodnet-flood-predictor",
        description="Predicts flood risk using real rainfall and river discharge data from Open-Meteo APIs",
        capabilities={
            "ai": ["nlp"],
            "protocols": ["http"],
            "services": ["flood-prediction", "risk-assessment"],
            "domains": ["flood", "weather", "prediction"],
        },
        webhook_host="0.0.0.0",
        webhook_port=int(os.environ.get("PORT", "5001")),
        registry_url="https://registry.zynd.ai",
        price="$0",
        api_key=os.environ["ZYND_API_KEY"],
        config_dir=".agent-flood-predictor",
    )

    zynd_agent = ZyndAIAgent(agent_config=agent_config)

    agent_executor = create_agent()
    zynd_agent.set_langchain_agent(agent_executor)

    def message_handler(message: AgentMessage, topic: str):
        import traceback

        print(f"\n{'='*60}")
        print(f"[Flood Predictor] Received: {message.content}")
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
    print("FloodNet Agent 1: Flood Predictor")
    print(f"Port: 5001")
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
