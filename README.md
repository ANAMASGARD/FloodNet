# FloodNet

**Multi-agent flood resilience. Built for the Zynd AIckathon.**

---

## How we use Zynd AI (Python SDK)

We use the **Zynd AI Python SDK** (`zyndai-agent`) in all five backend agents. This is how it fits the three core signals: **Publish**, **Search**, and **Pay**.

### Package and imports

- **Package:** `zyndai-agent` (see `floodnet/requirements.txt`).
- **Imports (every agent):**
  ```python
  from zyndai_agent.agent import AgentConfig, ZyndAIAgent
  from zyndai_agent.message import AgentMessage
  ```

### 1. Publish — each agent registers on the Zynd registry

Every agent **publishes** itself to the Zynd registry at startup so it can be discovered and called.

- We build an **`AgentConfig`** with: `name`, `description`, `capabilities` (e.g. `"flood"`, `"prediction"`, `"http"`), `webhook_host`, `webhook_port`, **`webhook_url`** (the **public** URL when deployed, so Zynd can reach us and mark the agent ACTIVE), `registry_url="https://registry.zynd.ai"`, and **`api_key=os.environ["ZYND_API_KEY"]`**.
- We create **`ZyndAIAgent(agent_config=agent_config)`**. The SDK registers this agent with the registry using that config.
- We attach our LangChain logic with **`zynd_agent.set_langchain_agent(agent_executor)`** and handle incoming requests with **`zynd_agent.add_message_handler(message_handler)`**. Inside the handler we call **`zynd_agent.invoke(message.content, chat_history=[])`** and then **`zynd_agent.set_response(message.message_id, response)`** so the SDK sends the reply back through Zynd.

So: **Publish** = AgentConfig + ZyndAIAgent + webhook registration. All five agents do this; when we deploy on Railway we set `webhook_url` to `https://<RAILWAY_PUBLIC_DOMAIN>/<path>/webhook` so all five show **ACTIVE** in the registry (see `webhook_proxy.py` and each agent’s `webhook_url` logic).

### 2. Search — the coordinator discovers other agents via the registry

The **coordinator** (agent 5) does not hardcode agent URLs. It **searches** the Zynd registry by capability and then calls whatever agent the registry returns.

- We call the Zynd **Search API**: `GET https://registry.zynd.ai/agents/search?q=<query>&limit=1` with header `Authorization: Bearer <ZYND_API_KEY>`.
- We take the first result’s **`endpoint`** (the agent’s webhook base URL) and call its **sync** endpoint: `POST <endpoint>/webhook/sync` with a JSON body built from **`AgentMessage(content=..., sender_id="floodnet-coordinator", message_type="query").to_dict()`**.
- We do this for each specialist: flood predictor (`query="flood prediction rainfall river discharge"`), zone mapper (`query="flood zone mapping shelters heatmap google places"`), rescue planner (`query="evacuation rescue route planner traffic ETA"`), and alert dispatcher (`query="flood alert multilingual dispatcher paid"`). So the coordinator **uses Zynd Search** to find and then call the right agent for each step.

Fallback: if the registry is down or returns no result, we use env vars (e.g. `PREDICTOR_URL`, `MAPPER_URL`) or `BASE_AGENT_HOST` + port so the system still works.

### 3. Pay — one agent is a paid (x402) agent

- The **alert dispatcher** (agent 4) sets **`price="$0.001"`** in `AgentConfig`. It is registered as a **paid** agent on Zynd; the SDK and registry support the **Pay** (x402) flow so callers can pay in USDC to use it.
- The other four agents use **`price="$0"`**. So we use **Pay** where it matters (paid alert agent) and **Publish** + **Search** across all five.

### Summary table

| Zynd signal | Where in our project |
|-------------|----------------------|
| **Publish** | All 5 agents: `AgentConfig` + `ZyndAIAgent` + `webhook_url` + `api_key` → register at `registry.zynd.ai`; HTTP webhook for incoming requests; `set_response()` for replies. |
| **Search** | Coordinator: `GET https://registry.zynd.ai/agents/search?q=...` with `ZYND_API_KEY`; then `POST <endpoint>/webhook/sync` with `AgentMessage` to call the discovered agent. |
| **Pay** | Agent 4 (alert dispatcher): `price="$0.001"` in `AgentConfig`; paid agent on the registry (x402). |

All of this lives in the **Python** code under **`floodnet/`** (the five `agent_*.py` files and the coordinator’s `search_and_call` / tool functions). The Next.js app talks to the coordinator via HTTP; the coordinator uses the Zynd Python SDK and registry for discovery and for handling incoming Zynd messages.

---

## What it is

FloodNet is a **command center** for flood response: you ask (voice or text), the system returns a **plan** — risk heatmap, hospitals, evacuation route, weather, intel — and shows it on a map. Five **Zynd AI agents** (coordinator + predictor, mapper, planner, alert dispatcher) run the logic; the frontend is a Neo‑brutalist Next.js app with Mapbox and VAPI voice.

- **5 agents** → all register on the Zynd registry and can show **ACTIVE** (one Railway deploy, one public URL, reverse proxy).
- **Zynd** → Publish, Search, Pay. Coordinator discovers and calls the other agents.
- **No fluff** → one repo, clear split: Next.js (Vercel), Python agents (Railway).

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind, Mapbox GL, VAPI (voice), Framer Motion |
| AI / Plan | Gemini, Perplexity; Open-Meteo, OpenWeather, Google Places, Routes API |
| Agents | Python 3.12, LangChain, Zynd SDK; 5 agents in one Docker container |
| Deploy | Vercel (Next.js), Railway (Docker → all 5 agents + webhook proxy) |

---

## Run locally

**Frontend**

```bash
cp .env.example .env   # add keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Command center: `/command-center`.

**Agents (optional, for full flow)**

```bash
cd floodnet
pip install -r requirements.txt
# set ZYND_API_KEY, GEMINI_API_KEY, etc. in .env
./start.sh
```

Coordinator runs on port 5000 (or 5005 if using proxy). Set `COORDINATOR_URL=http://localhost:5000` in the Next.js `.env` if you want the app to hit local agents.

---

## Deploy

- **Next.js** → Vercel. Env: `GEMINI_API_KEY`, `ZYND_API_KEY`, `COORDINATOR_URL` (Railway coordinator URL), Mapbox, VAPI, etc. See project docs if you have `VERCEL_DEPLOY.md`.
- **Agents** → Railway, one service, root Dockerfile. Env: `GEMINI_API_KEY`, `ZYND_API_KEY`, `RAILWAY_PUBLIC_DOMAIN` (set by Railway). All 5 agents get a public webhook path and can show ACTIVE. Details: **[floodnet/RAILWAY_DEPLOY.md](floodnet/RAILWAY_DEPLOY.md)**.

---

## Repo layout

```
├── app/                    # Next.js app (landing, command-center, API routes)
├── floodnet/               # Python Zynd agents
│   ├── agent_1_flood_predictor.py
│   ├── agent_2_zone_mapper.py
│   ├── agent_3_rescue_planner.py
│   ├── agent_4_alert_dispatcher.py
│   ├── agent_5_coordinator.py
│   ├── webhook_proxy.py    # One public URL → 5 webhooks (ACTIVE on Zynd)
│   └── start.sh
├── Dockerfile              # Single image: 5 agents + proxy (Railway)
└── README.md
```

---

## Philosophy

- **Neo‑brutalism** → Bold UI, clear hierarchy, no decoration for decoration’s sake.
- **Multi‑agent** → Real orchestration (coordinator + specialists), not a single LLM call.
- **Zynd‑first** → Publish, Search, Pay used so the system fits the hackathon criteria and the registry shows five ACTIVE agents.

---

## License

See repository. Built for Zynd Protocol AIckathon.
