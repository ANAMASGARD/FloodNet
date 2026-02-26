// ─── FloodNet Escalation Policy ─────────────────────────────────────────────
// Centralised, deterministic rules for when AI output warrants
// authority escalation vs. user-only guidance vs. suppression.
// ─────────────────────────────────────────────────────────────────────────────

const RISK_ORDER = ["none", "low", "moderate", "high", "extreme"] as const;
type RiskLevel = typeof RISK_ORDER[number];

// Minimum confidence required to escalate to authorities
const AUTHORITY_ESCALATION_CONFIDENCE = 0.65;

// Minimum risk level that triggers authority notification
const AUTHORITY_ESCALATION_RISK: RiskLevel = "high";

// User-alert min risk (more permissive than authority escalation)
const USER_ALERT_RISK: RiskLevel = "moderate";
const USER_ALERT_CONFIDENCE = 0.4;

// Cooldown in ms — prevents repeated authority emails for the same location
const AUTHORITY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── Decision types ───────────────────────────────────────────────────────────

export type PolicyDecision =
  | { action: "suppress"; reason: string }
  | { action: "user_alert_only"; reason: string }
  | { action: "escalate_to_authority"; reason: string };

// ─── Core policy function ─────────────────────────────────────────────────────

export function evaluateEscalationPolicy(params: {
  riskLevel: string;
  confidence: number;
  lastAuthorityNotifiedAt: Date | null;
  /** Precipitation in mm from weather data (optional corroboration) */
  precipitationMm?: number;
  /** River discharge m³/s (optional corroboration) */
  riverDischargeM3s?: number;
}): PolicyDecision {
  const riskIdx = RISK_ORDER.indexOf(params.riskLevel as RiskLevel);
  const userAlertIdx = RISK_ORDER.indexOf(USER_ALERT_RISK);
  const authorityIdx = RISK_ORDER.indexOf(AUTHORITY_ESCALATION_RISK);

  // 1. Below user alert threshold — suppress entirely
  if (riskIdx < userAlertIdx || params.confidence < USER_ALERT_CONFIDENCE) {
    return {
      action: "suppress",
      reason: `Risk "${params.riskLevel}" (confidence ${(params.confidence * 100).toFixed(0)}%) is below alert threshold`,
    };
  }

  // 2. Above user threshold but not authority threshold — user alert only
  if (
    riskIdx < authorityIdx ||
    params.confidence < AUTHORITY_ESCALATION_CONFIDENCE
  ) {
    return {
      action: "user_alert_only",
      reason: `Risk "${params.riskLevel}" (confidence ${(params.confidence * 100).toFixed(0)}%) warrants user alert but not authority escalation`,
    };
  }

  // 3. In authority cooldown window — user alert only (don't spam authorities)
  if (params.lastAuthorityNotifiedAt) {
    const elapsed = Date.now() - params.lastAuthorityNotifiedAt.getTime();
    if (elapsed < AUTHORITY_COOLDOWN_MS) {
      const hoursLeft = Math.ceil((AUTHORITY_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      return {
        action: "user_alert_only",
        reason: `Authority cooldown active — ${hoursLeft}h remaining to avoid duplicate escalations`,
      };
    }
  }

  // 4. Optional corroboration check — if AI says extreme but rain data contradicts,
  //    downgrade to user_alert_only to reduce false positives
  if (
    params.riskLevel === "extreme" &&
    params.precipitationMm !== undefined &&
    params.precipitationMm < 10 &&
    params.riverDischargeM3s !== undefined &&
    params.riverDischargeM3s < 100
  ) {
    return {
      action: "user_alert_only",
      reason: `AI says extreme but weather data (${params.precipitationMm}mm precip, ${params.riverDischargeM3s} m³/s discharge) doesn't corroborate — treating as user-alert only to avoid false positive`,
    };
  }

  // 5. All checks passed — escalate
  return {
    action: "escalate_to_authority",
    reason: `Risk "${params.riskLevel}" at ${(params.confidence * 100).toFixed(0)}% confidence meets authority escalation threshold`,
  };
}

// ─── Rescue request severity classifier ──────────────────────────────────────
// Classifies an incoming SOS request as low/moderate/high/critical
// based on the user's description keywords.

const CRITICAL_KEYWORDS = [
  "trapped", "drowning", "underwater", "swept", "missing", "unconscious",
  "injury", "medical", "child", "baby", "elder", "hospital", "dying", "dead",
];
const HIGH_KEYWORDS = [
  "rising water", "house flooded", "roof", "stranded", "need help",
  "evacuation", "can't leave", "stuck", "flood", "rescue",
];

export function classifyRescueSeverity(description: string): "critical" | "high" | "moderate" {
  const lower = description.toLowerCase();
  if (CRITICAL_KEYWORDS.some((kw) => lower.includes(kw))) return "critical";
  if (HIGH_KEYWORDS.some((kw) => lower.includes(kw))) return "high";
  return "moderate";
}
