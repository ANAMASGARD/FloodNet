"""
FloodNet Agent 4: Alert Dispatcher
Port: 5004 | Price: $0.001 (PAID via x402)

Generates multilingual flood alerts and emergency instructions.
This is a paid agent — every request costs 0.001 USDC via x402.
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
def format_alert_data(data: str) -> str:
    """Parse and validate the incoming flood data payload.
    Returns a structured summary for alert generation."""
    import json
    try:
        parsed = json.loads(data) if isinstance(data, str) else data
        return json.dumps(parsed, indent=2)
    except Exception as e:
        return f"Raw data: {data}"


SYSTEM_PROMPT = """You are FloodNet Alert Dispatcher.
You receive all flood data collected by other agents:
{{
  "language": "en|hi|mixed",
  "risk": {{"risk_level": str, "max_rain_mm": float, "summary": str}},
  "zones": {{"safe_shelters": [...], "flood_risk_zones": [...]}},
  "routes": {{"primary_route": {{...}}}},
  "user_query": str
}}

Generate 2-3 short, clear, calm, actionable alerts in the requested language.

Hindi example:
title: "Flood Alert - Ucch Jokhim"
body: "Aapke area mein agli 24 ghanton mein 73mm baarish expected hai. Abhi PRTF Community Hall (12 minute) ki taraf nikalna shuru karein."

English example:
title: "HIGH Flood Risk - Evacuate Now"
body: "Heavy rainfall (73mm) expected in 24 hours. Move to PRTF Community Hall immediately. Route: 12 minutes, 4.3km via NH-24."

coordinator_summary: 2-3 sentences combining risk, nearest shelter, and ETA.

Return ONLY this JSON (no markdown):
{{
  "agent": "floodnet-alert-dispatcher",
  "alerts": [
    {{
      "title": str,
      "body": str,
      "severity": "LOW|MEDIUM|HIGH|CRITICAL"
    }}
  ],
  "coordinator_summary": str,
  "status": "ok"
}}"""


def create_agent():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.environ["GEMINI_API_KEY"],
        temperature=0.2,
    )

    tools = [format_alert_data]

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
        name="floodnet-alert-dispatcher",
        description="Generates multilingual flood alerts and emergency instructions. Paid agent via x402.",
        capabilities={
            "ai": ["nlp"],
            "protocols": ["http"],
            "services": ["alert-generation", "multilingual-alerts"],
            "domains": ["flood", "alerts", "emergency"],
        },
        webhook_host="0.0.0.0",
        webhook_port=int(os.environ.get("PORT", "5004")),
        registry_url="https://registry.zynd.ai",
        price="$0.001",
        api_key=os.environ["ZYND_API_KEY"],
        config_dir=".agent-alert-dispatcher",
    )

    zynd_agent = ZyndAIAgent(agent_config=agent_config)

    agent_executor = create_agent()
    zynd_agent.set_langchain_agent(agent_executor)

    def message_handler(message: AgentMessage, topic: str):
        import traceback

        print(f"\n{'='*60}")
        print(f"[Alert Dispatcher] Received: {message.content}")
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
    print("FloodNet Agent 4: Alert Dispatcher (PAID)")
    print(f"Port: 5004")
    print(f"Price: 0.001 USDC per request (x402)")
    print(f"Webhook: {zynd_agent.webhook_url}")
    print(f"Agent ID: {zynd_agent.agent_id}")
    print(f"Payment Address: {zynd_agent.pay_to_address}")
    print(f"Zynd Registration: Active")
    print("=" * 60)
    print("\nType 'exit' to quit\n")

    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
