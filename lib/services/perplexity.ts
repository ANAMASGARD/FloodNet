// ─── Perplexity AI Risk Evaluator ───
// Uses Perplexity as the "brain" to assess flood risk from weather data.

interface RiskEvaluation {
  riskLevel: "none" | "low" | "moderate" | "high" | "extreme";
  confidence: number;       // 0.0 - 1.0
  reasoning: string;
  leadTimeHours: number | null;
  suggestedAction: string;
}

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

function parseRiskJson(text: string): RiskEvaluation {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Failed to parse risk evaluation from LLM: ${text}`);
  return JSON.parse(jsonMatch[0]) as RiskEvaluation;
}

export async function evaluateFloodRisk(params: {
  forecastSummary: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}): Promise<RiskEvaluation> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not set");

  const systemPrompt = `You are FloodNet's AI flood risk assessment engine for life-safety early warning.

Goal: classify flood risk conservatively, quickly, and actionably.
Rules:
- Prioritize avoiding false negatives (missing real flood risk).
- Use clear, localized reasoning tied to rainfall/discharge trends.
- Output only valid JSON matching schema.

You MUST respond with ONLY valid JSON matching this exact schema:
{
  "riskLevel": "none" | "low" | "moderate" | "high" | "extreme",
  "confidence": <number 0.0 to 1.0>,
  "reasoning": "<2-3 sentence explanation of WHY this risk level>",
  "leadTimeHours": <number or null — hours before expected event>,
  "suggestedAction": "<1-2 sentence actionable safety advice>"
}

Risk level guidelines:
- "none": No significant precipitation or flooding risk
- "low": Light rain expected, minimal risk, normal precautions
- "moderate": Heavy rain expected, localized flooding possible, prepare
- "high": Very heavy rain / storms, significant flooding likely, take action
- "extreme": Severe weather emergency, major flooding imminent, evacuate if needed

Consider: cumulative rainfall over 24-48h, humidity, wind, terrain/floodplain susceptibility, urban drainage limits, current season, and recent local flood warnings/news.

Be conservative — it is better to warn slightly early than miss a real flood event.`;

  const userPrompt = `Evaluate flood risk for: ${params.city}, ${params.country} (${params.lat}, ${params.lng})

Weather forecast data:
${params.forecastSummary}

Respond with ONLY the JSON object.`;

  const res = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed: RiskEvaluation = parseRiskJson(content);

  // Validate required fields
  if (!["none", "low", "moderate", "high", "extreme"].includes(parsed.riskLevel)) {
    throw new Error(`Invalid risk level: ${parsed.riskLevel}`);
  }
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.5;
  }

  return parsed;
}

// ─── Guardrails: should we send an alert? ───
const RISK_SEVERITY_ORDER = ["none", "low", "moderate", "high", "extreme"];
const MIN_CONFIDENCE = 0.4;
const COOLDOWN_HOURS = 12;

export function shouldSendAlert(params: {
  riskLevel: string;
  confidence: number;
  userThreshold: string;   // from user preferences
  lastAlertSentAt: Date | null;
}): { send: boolean; reason: string } {
  // 1. Confidence too low
  if (params.confidence < MIN_CONFIDENCE) {
    return { send: false, reason: `Confidence ${params.confidence} below threshold ${MIN_CONFIDENCE}` };
  }

  // 2. Risk below user threshold
  const riskIdx = RISK_SEVERITY_ORDER.indexOf(params.riskLevel);
  const thresholdIdx = RISK_SEVERITY_ORDER.indexOf(params.userThreshold);
  if (riskIdx < thresholdIdx) {
    return { send: false, reason: `Risk "${params.riskLevel}" below user threshold "${params.userThreshold}"` };
  }

  // 3. Risk is "none"
  if (params.riskLevel === "none") {
    return { send: false, reason: "No risk detected" };
  }

  // 4. Cooldown check
  if (params.lastAlertSentAt) {
    const hoursSince = (Date.now() - params.lastAlertSentAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < COOLDOWN_HOURS) {
      return { send: false, reason: `Cooldown active: last alert ${Math.round(hoursSince)}h ago (min ${COOLDOWN_HOURS}h)` };
    }
  }

  return { send: true, reason: "All checks passed" };
}
