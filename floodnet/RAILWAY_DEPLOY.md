# Deploy FloodNet Python Agents to Railway

Deploy all 5 Zynd AI agents to **Railway** so they run 24/7 and stay **active on the Zynd registry**. Your Next.js app stays on Vercel and will call the coordinator via its public Railway URL.

---

## Option A: One service with Docker (all 5 agents ACTIVE)

A **Dockerfile** at the **repo root** and **start.sh** run all 5 agents plus a **webhook proxy** in one Railway service. The proxy exposes one public URL and routes to each agent so **all 5 show ACTIVE** on the Zynd registry.

1. **Railway** → your FloodNet service → **Settings**.
2. **Root Directory:** leave **empty** (Dockerfile is at repo root).
3. **Build:** Railway uses the root Dockerfile (not Railpack).
4. **Start command:** leave **empty** (Dockerfile `CMD` runs `./start.sh`).
5. **Variables:** add `GEMINI_API_KEY`, `ZYND_API_KEY`, `GOOGLE_PLACE_API_KEY`, etc.
6. **Networking** → **Generate Domain**.
7. Deploy. Railway sets `RAILWAY_PUBLIC_DOMAIN`; each agent registers its public webhook URL:
   - Coordinator: `https://<domain>/webhook`
   - Flood predictor: `https://<domain>/predictor/webhook`
   - Zone mapper: `https://<domain>/mapper/webhook`
   - Rescue planner: `https://<domain>/planner/webhook`
   - Alert dispatcher: `https://<domain>/alert/webhook`  
   The coordinator still calls the other 4 at `localhost:5001–5004` internally; Zynd reaches all 5 via the proxy.

---

## Option B: Five separate services (no Docker)

| Service        | Agent file                  | Default port | Railway service name (suggested) |
|----------------|-----------------------------|--------------|----------------------------------|
| Flood Predictor| `agent_1_flood_predictor.py`| 5001         | `floodnet-predictor`             |
| Zone Mapper    | `agent_2_zone_mapper.py`    | 5002         | `floodnet-mapper`                |
| Rescue Planner | `agent_3_rescue_planner.py` | 5003         | `floodnet-planner`               |
| Alert Dispatcher (PAID) | `agent_4_alert_dispatcher.py` | 5004   | `floodnet-alert`                 |
| **Coordinator**| `agent_5_coordinator.py`    | 5000         | `floodnet-coordinator`           |

Each agent runs as its own Railway service. Railway sets `PORT`; the code uses it so the app listens on the correct port. No code changes needed beyond what’s already in the repo.

---

## Step 1: Create a Railway project and connect the repo

1. Go to [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo**.
3. Select the **FloodNet** repo (or your fork).
4. When asked for root directory, you’ll set it **per service** in the next steps. You can leave the project root for now and add services one by one.

---

## Step 2: Add five services from the same repo

Create **5 services** in the same project, all from the same repo, with different **Root Directory** and **Start Command**.

### 2.1 Service 1 – Flood Predictor

1. In the project: **+ New** → **GitHub Repo** (same repo again) or **Duplicate Service** and then change settings.
2. **Settings** for this service:
   - **Name:** `floodnet-predictor`
   - **Root Directory:** `floodnet`
   - **Start Command:** `python agent_1_flood_predictor.py`
   - **Watch Paths:** `floodnet/agent_1_flood_predictor.py` (optional, for redeploys)
3. **Variables** (see “Environment variables” below): add all shared vars; this agent doesn’t need Google Places or OpenWeather.
4. **Settings** → **Networking** → **Generate Domain** so you get a URL like `floodnet-predictor-production.up.railway.app`.

### 2.2 Service 2 – Zone Mapper

- **Name:** `floodnet-mapper`
- **Root Directory:** `floodnet`
- **Start Command:** `python agent_2_zone_mapper.py`
- Add same **Variables** as below (needs `GOOGLE_PLACE_API_KEY`, `OPENWEATHER_API_KEY`).
- **Generate Domain.**

### 2.3 Service 3 – Rescue Planner

- **Name:** `floodnet-planner`
- **Root Directory:** `floodnet`
- **Start Command:** `python agent_3_rescue_planner.py`
- **Variables:** needs `GEMINI_API_KEY`, `GOOGLE_PLACE_API_KEY`, `ZYND_API_KEY`.
- **Generate Domain.**

### 2.4 Service 4 – Alert Dispatcher (PAID)

- **Name:** `floodnet-alert`
- **Root Directory:** `floodnet`
- **Start Command:** `python agent_4_alert_dispatcher.py`
- **Variables:** needs `GEMINI_API_KEY`, `ZYND_API_KEY`.
- **Generate Domain.**

### 2.5 Service 5 – Coordinator (main entry for Zynd)

- **Name:** `floodnet-coordinator`
- **Root Directory:** `floodnet`
- **Start Command:** `python agent_5_coordinator.py`
- **Variables:** all shared vars **plus** the 4 agent URLs (see “Coordinator-only variables”).
- **Generate Domain.**

---

## Step 3: Environment variables

Set these in **Railway** → each service → **Variables** (or use **Shared Variables** for the project and override per service if needed).

### Shared (all 5 services)

| Variable           | Required | Description |
|--------------------|----------|-------------|
| `GEMINI_API_KEY`   | Yes      | Google AI Studio API key for Gemini. |
| `ZYND_API_KEY`     | Yes      | From Zynd; used for registry (Publish/Search). |
| `GOOGLE_PLACE_API_KEY` | Yes* | Google Places (and Routes) API key. *Needed by Zone Mapper + Rescue Planner. |

### Optional (for richer behavior)

| Variable             | Used by        | Description |
|----------------------|----------------|-------------|
| `OPENWEATHER_API_KEY`| Zone Mapper    | OpenWeatherMap API for current weather. |
| `PERPLEXITY_API_KEY` | Next.js only  | Not needed by Python agents. |

### Coordinator-only (Service 5)

After the other 4 services have **public URLs**, set these on **floodnet-coordinator** so it can call them when Zynd search is unavailable or you want fixed fallbacks:

| Variable             | Example value                                              |
|----------------------|------------------------------------------------------------|
| `PREDICTOR_URL`      | `https://floodnet-predictor-production.up.railway.app`     |
| `MAPPER_URL`         | `https://floodnet-mapper-production.up.railway.app`        |
| `PLANNER_URL`        | `https://floodnet-planner-production.up.railway.app`       |
| `ALERT_DISPATCHER_URL` | `https://floodnet-alert-production.up.railway.app`       |

- Do **not** add a trailing slash.
- If these are set, the coordinator uses them as fallback when the Zynd registry returns no agents.
- If you leave them unset, the coordinator still works locally with `BASE_AGENT_HOST` (e.g. `http://localhost`).

**Local-only (not needed on Railway):**

- `BASE_AGENT_HOST`: e.g. `http://localhost`. Only used when `PREDICTOR_URL` / `MAPPER_URL` / etc. are **not** set. You can omit it on Railway if you set the 4 URLs above.

---

## Step 4: Deploy and get URLs

1. Save variables and trigger a deploy (push to the repo or **Redeploy** in Railway).
2. For each service, open **Settings** → **Networking** → **Generate Domain** if you haven’t already.
3. Copy the public URL for each service (e.g. `https://floodnet-coordinator-production.up.railway.app`).
4. On **floodnet-coordinator**, set `PREDICTOR_URL`, `MAPPER_URL`, `PLANNER_URL`, `ALERT_DISPATCHER_URL` to these URLs (no `/webhook` or port), then redeploy the coordinator once.

---

## Step 5: Zynd registry (all 5 agents ACTIVE)

- All 5 agents use **Zynd SDK** and register at startup with **public** webhook URLs so Zynd can reach them.
- Railway sets **`RAILWAY_PUBLIC_DOMAIN`** automatically. A **webhook proxy** listens on Railway’s `PORT` and forwards:
  - `/webhook` → coordinator (5005)
  - `/predictor/webhook`, `/mapper/webhook`, `/planner/webhook`, `/alert/webhook` → agents 1–4 (5001–5004)
- Each agent passes `webhook_url=https://<RAILWAY_PUBLIC_DOMAIN>/<path>/webhook` to the SDK, so the registry stores the public URL and all 5 show **ACTIVE**. No ngrok, no 24/7 laptop.
- Ensure **Networking** → **Public networking** is enabled and a domain is generated.

---

## Step 6: Point Vercel (Next.js) at Railway

In your **Vercel** project (Next.js), add:

| Variable | Value | Notes |
|----------|--------|--------|
| `COORDINATOR_URL` | `https://floodnet-coordinator-production.up.railway.app` | Use your coordinator’s **exact** Railway URL (no trailing slash, no `/webhook`). |

- The Next.js API uses this when Zynd registry search doesn’t return a coordinator (e.g. auth or network issues), so the app still works.
- If the coordinator is discovered via Zynd, that URL is used instead; `COORDINATOR_URL` is the fallback.
- Optional: `BASE_AGENT_HOST` can be set to the same coordinator URL for compatibility; the API prefers `COORDINATOR_URL` when Zynd returns no coordinator.

---

## Checklist

- [ ] Railway project created and repo connected.
- [ ] Five services created with **Root Directory** = `floodnet` and correct **Start Command** per agent.
- [ ] `GEMINI_API_KEY`, `ZYND_API_KEY`, `GOOGLE_PLACE_API_KEY` set on all services that need them.
- [ ] Domain generated for each service (public URL).
- [ ] Coordinator has `PREDICTOR_URL`, `MAPPER_URL`, `PLANNER_URL`, `ALERT_DISPATCHER_URL` set to the other four Railway URLs.
- [ ] All 5 services deployed and running (no crash loops).
- [ ] Vercel env: `BASE_AGENT_HOST` = coordinator Railway URL (if your app calls it by URL).

---

## Troubleshooting

- **Port:** Railway sets `PORT`; the app uses it automatically. You don’t set `PORT` in Variables.
- **Agent not on Zynd:** Ensure `ZYND_API_KEY` is correct and the service has a **public** domain. Check logs for “Synced webhook URL with the registry” or similar.
- **Coordinator can’t reach other agents:** Set the four `*_URL` env vars on the coordinator to the exact Railway URLs (https, no trailing slash).
- **Module not found:** Ensure **Root Directory** is `floodnet` so `requirements.txt` and the agent files are in the same directory when the build runs.
