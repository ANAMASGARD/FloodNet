import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════
//  FloodNet AI Agent — Perplexity sonar-pro Orchestration
//
//  Flow:
//    User input → Perplexity sonar conversation → extract location
//    → Fetch OpenWeather + Google Places data in parallel
//    → Perplexity sonar-pro synthesises plan (real-time web search)
//    → Return FloodResponsePlan → Mapbox visualisation
// ═══════════════════════════════════════════════════════════════════════

const PLACES_KEY  = process.env.GOOGLE_PLACE_API_KEY  || '';
const OW_KEY      = process.env.OPENWEATHER_API_KEY   || '';
const PPLX_KEY    = process.env.PERPLEXITY_API_KEY    || '';

// ═══════════════════════════ MAIN HANDLER ═══════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, isFinal = false, isFollowUp = false, user_location, household } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 });
    }

    const validated = validateMessages(messages);
    const locationContext =
      user_location &&
      typeof user_location.latitude  === 'number' &&
      typeof user_location.longitude === 'number'
        ? {
            latitude:  user_location.latitude  as number,
            longitude: user_location.longitude as number,
            placeName: user_location.placeName as string | undefined,
          }
        : null;

    if (isFinal) {
      console.log('[FloodNet] Generating flood response plan…', locationContext ? '(with user location)' : '');
      return await generateFloodPlan(validated, locationContext, household);
    }

    console.log('[FloodNet] Conversation:', { count: validated.length, isFollowUp, hasUserLocation: !!locationContext });
    return await handleConversation(validated, isFollowUp, locationContext);
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error('[FloodNet] Error:', msg);

    if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
      return NextResponse.json({
        resp: 'AI quota temporarily exceeded. Please wait 30 seconds and try again.',
        ui: 'none',
      });
    }

    return NextResponse.json(
      { resp: 'FloodNet AI encountered an error. Please try again.', ui: 'none' },
      { status: 500 },
    );
  }
}

// ═══════════════════════ SYSTEM PROMPTS ═══════════════════════════

function buildConvoSystem(userLocation: { latitude: number; longitude: number; placeName?: string } | null): string {
  const locationLine = userLocation
    ? `\nUSER'S DEVICE LOCATION (already obtained from browser GPS): lat ${userLocation.latitude}, lng ${userLocation.longitude}${userLocation.placeName ? ` (${userLocation.placeName})` : ''}. The location is already known — do NOT ask the user for their location.\n`
    : '';

  return `You are FloodNet Command Center AI — an emergency flood response dispatcher for life-safety incidents.

PRIMARY OBJECTIVE:
- Move from user report to actionable map plan FAST.
- Minimize questioning; infer from available context wherever possible.
${locationLine}
INFORMATION TARGETS (collect quickly — location is ALREADY KNOWN from GPS, skip it):
1) SEVERITY (critical/high/moderate/low)
2) EMERGENCY TYPE (rescue/evacuation/medical/supply_delivery/prediction/mixed)

BEHAVIOR RULES:
- NEVER ask for location, city, address, or coordinates. Location is pre-loaded from browser GPS.
- Keep response concise (max 2 short sentences).
- Ask at most ONE missing-item question; never ask multiple questions in one turn.
- If severity/type are implicit from user message, infer them and proceed.
- Use calm, human, urgent-but-reassuring tone in user's language.
- As soon as severity and type are sufficiently known, return ui="final".
- If still missing critical info, return ui="none".

Respond ONLY JSON:
{"resp":"string","ui":"none"|"final"}`;
}

const FOLLOWUP_SYSTEM = `You are FloodNet AI. A flood response plan has already been generated.
Answer follow-up questions helpfully and concisely in the user's language.
Respond with ONLY this JSON:
{"resp": "your response", "ui": "none"}`;

function extractJsonObject(text: string) {
  const trimmed = (text || '').trim();
  // Strip Perplexity citation markers e.g. [1], [2], [1][2] from values so JSON.parse succeeds
  const clean = trimmed.replace(/\[\d+\](?:\[\d+\])*/g, '');
  try { return JSON.parse(clean); } catch { /* noop */ }
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object in model response: ${clean.slice(0, 200)}`);
  try { return JSON.parse(match[0]); } catch (e2) {
    // Last-ditch: strip trailing commas before } or ] which LLMs sometimes emit
    const sanitised = match[0].replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(sanitised);
  }
}

async function callPerplexityJson(args: {
  model: 'sonar' | 'sonar-pro';
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  max_tokens: number;
  temperature: number;
  timeoutMs: number;
}) {
  if (!PPLX_KEY) throw new Error('PERPLEXITY_API_KEY missing');

  // Do NOT send response_format — Perplexity sonar/sonar-pro reject it on many API versions.
  // Instead, the system prompt instructs JSON-only output and extractJsonObject() parses it.
  const body: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
    max_tokens: args.max_tokens,
    temperature: args.temperature,
  };

  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PPLX_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(args.timeoutMs),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    console.error(`[FloodNet] Perplexity ${args.model} HTTP ${r.status}:`, errText.slice(0, 500));
    throw new Error(`Perplexity ${args.model} returned ${r.status}: ${errText.slice(0, 200)}`);
  }

  const data: any = await r.json();
  const text: string = data.choices?.[0]?.message?.content ?? '{}';
  return extractJsonObject(text);
}

// ═══════════════════════ CONVERSATION HANDLER ═══════════════════════

async function handleConversation(
  messages: { role: string; content: string }[],
  isFollowUp: boolean,
  userLocation: { latitude: number; longitude: number; placeName?: string } | null,
) {
  const systemPrompt = isFollowUp ? FOLLOWUP_SYSTEM : buildConvoSystem(userLocation);

  try {
    const output = await callPerplexityJson({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      max_tokens: 256,
      temperature: 0.35,
      timeoutMs: 15000,
    });
    return NextResponse.json(output);
  } catch (e) {
    console.warn('[FloodNet] Perplexity conversation failed:', (e as Error).message);
  }

  return NextResponse.json({ resp: 'AI service unavailable. Please try again in a moment.', ui: 'none' });
}



// ═══════════════════════ PLAN GENERATION ═══════════════════════

interface LocationInfo {
  location: string;
  lat: number;
  lng: number;
  severity: string;
  emergency_type: string;
  needs: string[];
}

async function extractLocation(
  messages: { role: string; content: string }[],
  userLocation: { latitude: number; longitude: number; placeName?: string } | null,
): Promise<LocationInfo> {
  const convo = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

  // If we have device GPS, always use it as the primary coordinates.
  // The AI only needs to extract severity, type, and needs from the conversation.
  const userLocNote =
    userLocation != null
      ? `\nThe user's device GPS location is: lat ${userLocation.latitude}, lng ${userLocation.longitude}${userLocation.placeName ? ` (${userLocation.placeName})` : ''}. USE THESE COORDINATES for lat/lng. The user was NOT asked for location — it comes from browser GPS.\n`
      : '';

  const prompt = `Analyze this flood emergency conversation and extract structured information.
${userLocNote}
Conversation:
${convo}

Return ONLY this JSON (no markdown, no explanation):
{
  "location": "human-readable location name (city, state, country)",
  "lat": <latitude as number>,
  "lng": <longitude as number>,
  "severity": "critical|high|moderate|low",
  "emergency_type": "rescue|evacuation|medical|supply_delivery|mixed",
  "needs": ["list", "of", "specific", "needs"]
}

${userLocation ? `IMPORTANT: Use lat=${userLocation.latitude}, lng=${userLocation.longitude} for the coordinates. Derive the location name from these coordinates or the conversation.` : 'Use geography knowledge for lat/lng when a place name is given.'}`;

  let parsed: LocationInfo;
  try {
    parsed = await callPerplexityJson({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a location extraction assistant. Return only strict JSON.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 256,
      temperature: 0.2,
      timeoutMs: 15000,
    }) as LocationInfo;
  } catch (e) {
    console.warn('[FloodNet] Perplexity location extraction failed:', (e as Error).message);
    throw e;
  }

  if (userLocation != null && (parsed.lat == null || parsed.lng == null)) {
    parsed.lat = userLocation.latitude;
    parsed.lng = userLocation.longitude;
    if (!parsed.location || parsed.location === '') parsed.location = userLocation.placeName || 'User current location';
  }
  return parsed;
}

function detectLanguage(messages: { role: string; content: string }[]): string {
  const text = messages.map(m => m.content).join(' ');
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const total = text.length;
  if (hindiChars > total * 0.3) return 'hi';
  if (hindiChars > total * 0.05) return 'mixed';
  return 'en';
}

async function generateFloodPlan(
  messages: { role: string; content: string }[],
  userLocation: { latitude: number; longitude: number; placeName?: string } | null,
  household?: { floor_level: string; vulnerable_members: string[]; has_vehicle: boolean },
) {
  const loc = await extractLocation(messages, userLocation);
  const language = detectLanguage(messages);
  console.log('[FloodNet] Location:', loc.location, `(${loc.lat}, ${loc.lng})`);

  // ─── Parallel data fetches ───────────────────────────────────────
  const [weatherR, dischargeR, sheltersR, hospitalsR, owR] = await Promise.allSettled([
    fetchWeatherForecast(loc.lat, loc.lng),
    fetchRiverDischarge(loc.lat, loc.lng),
    fetchShelters(loc.lat, loc.lng),
    fetchHospitals(loc.lat, loc.lng),
    fetchCurrentWeather(loc.lat, loc.lng),
  ]);

  const weather       = weatherR.status       === 'fulfilled' ? weatherR.value       : null;
  const discharge     = dischargeR.status     === 'fulfilled' ? dischargeR.value     : null;
  const shelters      = sheltersR.status      === 'fulfilled' ? sheltersR.value      : [];
  const hospitals     = hospitalsR.status     === 'fulfilled' ? hospitalsR.value     : [];
  const currentWeather = owR.status           === 'fulfilled' ? owR.value            : null;

  let routeData: any = null;
  if (shelters.length > 0) {
    try { routeData = await fetchEvacuationRoute(loc.lat, loc.lng, shelters[0].lat, shelters[0].lng); }
    catch { /* graceful */ }
  }

  const heatmapPoints = generateHeatmapPoints(loc.lat, loc.lng, weather, discharge);
  const riskLevel     = calculateRiskLevel(weather, discharge);
  const dataBundle    = { weather, discharge, shelters, hospitals, currentWeather, floodNews: '', routeData, heatmapPoints, riskLevel };

  let plan: any;
  try {
    plan = await synthesizePlanPerplexity(loc, dataBundle, messages, language, household);
    console.log('[FloodNet] Plan synthesised via Perplexity sonar-pro');
  } catch (e) {
    console.error('[FloodNet] Perplexity synthesis failed:', (e as Error).message);
    return NextResponse.json({ error: 'Failed to generate flood response plan. Please try again.' }, { status: 500 });
  }

  // ─── Ensure all map-visible fields are populated ─────────────────
  if (!plan.heatmap_points?.length) plan.heatmap_points = heatmapPoints;
  if (!plan.risk_level)             plan.risk_level = riskLevel;
  plan.weather_current = currentWeather || plan.weather_current;

  plan.hospitals = hospitals.map((h: any) => ({
    name: h.name, address: h.address,
    geo_coordinates: { latitude: h.lat, longitude: h.lng },
    distance_km: h.distance_km, open_now: h.open_now, at_risk: h.at_risk,
  }));

  if (!plan.safe_zones?.length) {
    plan.safe_zones = shelters.length > 0
      ? shelters.slice(0, 6).map((s: any) => ({
          name: s.name || 'Shelter',
          geo_coordinates: { latitude: s.lat, longitude: s.lng },
          capacity: 500, current_occupancy: 0, specialty: 'General Relief', eta_minutes: 15,
        }))
      : [{ name: 'Nearest designated shelter', geo_coordinates: { latitude: loc.lat + 0.008, longitude: loc.lng + 0.006 }, capacity: 500, current_occupancy: 0, specialty: 'General Relief', eta_minutes: 15 }];
  }
  if (!Array.isArray(plan.safe_zones)) plan.safe_zones = [];

  if (!plan.flood_zones?.length) {
    plan.flood_zones = [{
      zone_name: `${loc.location} (primary)`,
      severity: (plan.risk_level || riskLevel || 'moderate').toLowerCase() as 'critical' | 'high' | 'moderate' | 'low',
      geo_coordinates: { latitude: loc.lat, longitude: loc.lng },
      water_level_m: 1.5, affected_population: 5000,
      description: 'AI-assessed flood risk area based on weather and river discharge.',
    }];
  }
  if (!Array.isArray(plan.flood_zones))      plan.flood_zones = [];
  if (!Array.isArray(plan.rescue_teams))     plan.rescue_teams = [];
  if (!Array.isArray(plan.evacuation_routes)) plan.evacuation_routes = [];

  if (routeData?.polyline_coords?.length && !plan.route_polyline?.length) {
    plan.route_polyline = routeData.polyline_coords;
  }

  return NextResponse.json({ flood_response: plan });
}

// ═══════════════════ PERPLEXITY PLAN SYNTHESIS (PRIMARY) ═══════════

async function synthesizePlanPerplexity(
  loc: LocationInfo,
  data: { weather: any; discharge: any; shelters: any[]; hospitals: any[]; currentWeather: any; floodNews: string; routeData: any; heatmapPoints: any[]; riskLevel: string },
  messages: { role: string; content: string }[],
  language: string,
  household?: { floor_level: string; vulnerable_members: string[]; has_vehicle: boolean },
) {
  const p0 = data.weather?.daily?.precipitation_sum?.[0] ?? 0;
  const p1 = data.weather?.daily?.precipitation_sum?.[1] ?? 0;
  const p2 = data.weather?.daily?.precipitation_sum?.[2] ?? 0;
  const ds = data.discharge?.daily?.river_discharge || [];
  const maxD = ds.length > 0 ? Math.max(...ds.filter(Boolean)) : 0;
  const convo = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const systemPrompt = `You are FloodNet AI Planner, an emergency-grade flood operations co-pilot.

Mission priorities (in order):
1) Protect life (rescue, evacuation, medical urgency)
2) Reduce exposure (move people away from rising water / unstable routes)
3) Maintain continuity (supplies, access to shelters/hospitals)

Reasoning policy:
- Fuse provided API telemetry + current web intelligence.
- Prefer specific, local, time-bound actions over generic advice.
- If uncertain, choose safer conservative recommendation.
- Output must be VALID JSON only, no markdown.`;

  const householdBlock = household
    ? `\nHOUSEHOLD CONTEXT (personalize the micro_playbook based on this):
- Floor level: ${household.floor_level}
- Vulnerable members: ${household.vulnerable_members.length > 0 ? household.vulnerable_members.join(', ') : 'None'}
- Vehicle available: ${household.has_vehicle ? 'Yes' : 'No'}
`
    : '';

  const userPrompt = `LOCATION: ${loc.location} (lat ${loc.lat}, lng ${loc.lng})
SEVERITY: ${loc.severity} | TYPE: ${loc.emergency_type} | NEEDS: ${loc.needs.join(', ')}
LANGUAGE: ${language}
${householdBlock}
REAL-TIME DATA:
- OpenWeather: ${data.currentWeather ? JSON.stringify(data.currentWeather) : 'N/A'}
- Precipitation (Open-Meteo, mm): Day0=${p0}, Day1=${p1}, Day2=${p2}
- River Discharge (max ${maxD} m³/s) | Calculated Risk: ${data.riskLevel.toUpperCase()}
- Shelters (Google Places): ${JSON.stringify(data.shelters.slice(0, 4))}
- Hospitals nearby: ${JSON.stringify(data.hospitals.slice(0, 4))}
- Route to nearest shelter: ${data.routeData ? `${data.routeData.distance_km}km, ${data.routeData.eta_minutes}min, traffic=${data.routeData.traffic}` : 'N/A'}
- Conversation: ${convo}

TASK: Search the web NOW for current flood news, district advisories, rescue ops, road closures, dam releases, and weather alerts in ${loc.location}. Combine with provided telemetry to generate an operational map-ready plan.

Return this exact JSON schema:
{
  "location": "${loc.location}",
  "severity": "${data.riskLevel}",
  "emergency_type": "${loc.emergency_type}",
  "summary": "<4-5 sentences using real searched + API data>",
  "perplexity_context": "<3-4 sentences of web-searched current flood intelligence>",
  "center_coordinates": {"latitude": ${loc.lat}, "longitude": ${loc.lng}},
  "flood_zones": [{"zone_name": "str", "severity": "critical|high|moderate|low", "geo_coordinates": {"latitude": 0.0, "longitude": 0.0}, "water_level_m": 0.0, "affected_population": 0, "description": "str"}],
  "safe_zones": [{"name": "str", "geo_coordinates": {"latitude": 0.0, "longitude": 0.0}, "capacity": 0, "current_occupancy": 0, "specialty": "str", "eta_minutes": 0}],
  "rescue_teams": [{"team_id": "str", "team_name": "str", "status": "deployed|standby|en_route", "geo_coordinates": {"latitude": 0.0, "longitude": 0.0}, "equipment": ["str"], "eta_minutes": 0}],
  "evacuation_routes": [{"route_name": "str", "from": {"latitude": ${loc.lat}, "longitude": ${loc.lng}}, "to": {"latitude": 0.0, "longitude": 0.0}, "distance_km": 0.0, "estimated_time_minutes": 0, "status": "clear|partial|blocked"}],
  "immediate_actions": [{"step": 1, "title": "str", "description": "str", "priority": "critical|high|medium"}],
  "resource_needs": [{"item": "str", "quantity": "str", "urgency": "immediate|within_hours|within_day"}],
  "risk_timeline": [
    {"hours_from_now": 6, "risk_level": "low|moderate|high|extreme", "description": "what to expect in next 6h"},
    {"hours_from_now": 12, "risk_level": "low|moderate|high|extreme", "description": "12h outlook"},
    {"hours_from_now": 24, "risk_level": "low|moderate|high|extreme", "description": "24h outlook"},
    {"hours_from_now": 48, "risk_level": "low|moderate|high|extreme", "description": "48h outlook"}
  ],
  "micro_playbook": [
    {"step_number": 1, "action": "str", "timeframe": "now|within_1h|within_6h|within_12h", "reason": "why this matters"}
  ],
  "source_citations": [
    {"claim": "specific factual claim from your plan", "source": "source name or URL"}
  ],
  "obstacles": [
    {"type": "road_closed|bridge_out|debris|power_line|landslide|submerged_road", "description": "str", "geo_coordinates": {"latitude": 0.0, "longitude": 0.0}, "severity": "critical|high|moderate", "affects_route": "name of route if relevant"}
  ],
  "disclaimer": "AI-generated plan. Verify with local emergency management authorities."
}

RULES:
- risk_timeline: Use qualitative levels based on precipitation forecast trends. 4 entries (6h, 12h, 24h, 48h).
- micro_playbook: 5-8 personalized survival steps. ${household ? `This household is on ${household.floor_level} floor, has ${household.vulnerable_members.length > 0 ? household.vulnerable_members.join(', ') : 'no vulnerable members'}, ${household.has_vehicle ? 'has a vehicle' : 'no vehicle'}.` : 'No household info provided, give general advice.'} Prioritize actions for their specific situation.
- source_citations: 3-5 citations. Cite web sources you found for flood claims.
- obstacles: 3-6 realistic road/infrastructure hazards near the flood zones. Use REAL road names and coordinates near ${loc.location}. Types: road_closed (flooded road), bridge_out (damaged bridge), debris (fallen trees/wreckage), power_line (downed power line), landslide, submerged_road. Place them along or near evacuation routes to warn users.`;

  const plan = await callPerplexityJson({
    model: 'sonar-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.25,
    timeoutMs: 45000,
  });

  plan.heatmap_points = data.heatmapPoints;
  plan.risk_level     = data.riskLevel;
  plan.weather_current = data.currentWeather;
  if (data.routeData?.polyline_coords?.length) plan.route_polyline = data.routeData.polyline_coords;

  return plan;
}

// ═══════════════════════ API FETCHERS ═══════════════════════

async function fetchWeatherForecast(lat: number, lng: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('hourly', 'precipitation,rain');
  url.searchParams.set('daily', 'precipitation_sum,rain_sum');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', 'auto');
  const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  return r.json();
}

async function fetchRiverDischarge(lat: number, lng: number) {
  const url = new URL('https://flood-api.open-meteo.com/v1/flood');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('daily', 'river_discharge');
  url.searchParams.set('forecast_days', '7');
  const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  return r.json();
}

async function fetchShelters(lat: number, lng: number) {
  if (!PLACES_KEY) return [];
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', '8000');
  url.searchParams.set('keyword', 'community hall shelter school relief camp');
  url.searchParams.set('key', PLACES_KEY);
  const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  const data = await r.json();
  return (data.results || []).slice(0, 6).map((p: any) => ({
    name: p.name,
    address: p.vicinity || p.formatted_address || '',
    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,
    rating: p.rating || 0,
    open_now: p.opening_hours?.open_now ?? true,
  }));
}

async function fetchHospitals(lat: number, lng: number) {
  if (!PLACES_KEY) return [];
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', '6000');
  url.searchParams.set('type', 'hospital');
  url.searchParams.set('key', PLACES_KEY);
  const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  const data = await r.json();
  return (data.results || []).slice(0, 6).map((p: any) => {
    const hLat = p.geometry?.location?.lat;
    const hLng = p.geometry?.location?.lng;
    const dist = haversineKm(lat, lng, hLat, hLng);
    return {
      name: p.name,
      address: p.vicinity || p.formatted_address || '',
      lat: hLat, lng: hLng,
      distance_km: Math.round(dist * 10) / 10,
      open_now: p.opening_hours?.open_now ?? true,
      at_risk: dist < 3,
    };
  });
}

async function fetchCurrentWeather(lat: number, lng: number) {
  if (!OW_KEY) return null;
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('appid', OW_KEY);
  url.searchParams.set('units', 'metric');
  const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  const d = await r.json();
  return {
    temp_c: d.main?.temp ?? 0,
    rainfall_mm: d.rain?.['1h'] ?? d.rain?.['3h'] ?? 0,
    humidity_pct: d.main?.humidity ?? 0,
    wind_speed_kmh: Math.round((d.wind?.speed ?? 0) * 3.6),
    description: d.weather?.[0]?.description ?? '',
  };
}

async function fetchFloodNews(location: string) {
  if (!PPLX_KEY) return '';
  try {
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PPLX_KEY}` },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: `Brief 3-4 sentence summary of current flood situation in ${location}. Include water levels, affected areas, rescue operations, government advisories. If no current flooding, say so.`,
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    return data.choices?.[0]?.message?.content || '';
  } catch { return ''; }
}

async function fetchEvacuationRoute(oLat: number, oLng: number, dLat: number, dLng: number) {
  if (!PLACES_KEY) return null;
  const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: oLat, longitude: oLng } } },
      destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  const route = data.routes?.[0];
  if (!route) return null;
  const dur = parseInt(String(route.duration || '0s').replace('s', ''), 10);
  const enc = route.polyline?.encodedPolyline || '';
  return {
    eta_minutes: Math.round(dur / 60),
    distance_km: Math.round((route.distanceMeters || 0) / 100) / 10,
    polyline_encoded: enc,
    polyline_coords: enc ? decodePolyline(enc) : [],
    traffic: dur > 1800 ? 'HEAVY' : dur > 900 ? 'MODERATE' : 'CLEAR',
  };
}

// ═══════════════════════ DATA PROCESSING ═══════════════════════

function generateHeatmapPoints(lat: number, lng: number, weather: any, discharge: any) {
  const points: { latitude: number; longitude: number; intensity: number }[] = [];
  let base = 0.3;
  const precip = weather?.daily?.precipitation_sum?.[0] ?? 0;
  if (precip >= 64.5) base = 0.95;
  else if (precip >= 35.5) base = 0.8;
  else if (precip >= 15.5) base = 0.6;

  const discharges = discharge?.daily?.river_discharge || [];
  const maxD = discharges.length > 0 ? Math.max(...discharges.filter(Boolean)) : 0;
  if (maxD > 1000) base = Math.max(base, 0.95);
  else if (maxD > 500) base = Math.max(base, 0.8);
  else if (maxD > 200) base = Math.max(base, 0.6);

  const offsets = [-0.025, -0.018, -0.012, -0.006, 0, 0.006, 0.012, 0.018, 0.025];
  for (const dlat of offsets) {
    for (const dlng of offsets) {
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      const factor = Math.max(0, 1 - dist / 0.04);
      const intensity = Math.max(0.05, Math.min(1.0, base * factor + (Math.random() - 0.5) * 0.08));
      points.push({ latitude: lat + dlat, longitude: lng + dlng, intensity });
    }
  }
  return points;
}

function calculateRiskLevel(weather: any, discharge: any): string {
  const p = weather?.daily?.precipitation_sum?.[0] ?? 0;
  const ds = discharge?.daily?.river_discharge || [];
  const maxD = ds.length > 0 ? Math.max(...ds.filter(Boolean)) : 0;
  if (p >= 64.5 || maxD > 1000) return 'critical';
  if (p >= 35.5 || maxD > 500) return 'high';
  if (p >= 15.5 || maxD > 200) return 'moderate';
  return 'low';
}

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════ UTILITIES ═══════════════════════

function validateMessages(messages: any[]) {
  const result: { role: string; content: string }[] = [];
  let lastRole: string | null = null;
  for (const msg of messages) {
    if (msg.role === lastRole) continue;
    if (!msg.content || String(msg.content).trim() === '') continue;
    if (msg.role === 'user' || msg.role === 'assistant') {
      result.push({ role: msg.role, content: String(msg.content) });
      lastRole = msg.role;
    }
  }
  while (result.length > 0 && result[0].role === 'assistant') result.shift();
  if (result.length === 0) result.push({ role: 'user', content: 'I need help with flood response.' });
  if (result[result.length - 1].role !== 'user') result.push({ role: 'user', content: 'Continue helping me.' });
  return result;
}
