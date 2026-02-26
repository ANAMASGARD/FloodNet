// ─── FloodNet Inngest Functions ─────────────────────────────────────────────
// Three event-driven workflows with automatic retries:
//   1. flood/alert.requested   — send user alert email
//   2. flood/rescue.requested  — SOS dispatch to authority + NGO
//   3. flood/risk.extreme      — auto-escalate AI-detected extreme/high risk
// ─────────────────────────────────────────────────────────────────────────────

import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import {
  sendEmail,
  buildRescueAckEmail,
  buildAuthorityAlertEmail,
  buildAutoEscalationEmail,
} from "@/lib/services/plunk";
import { db } from "@/lib/db";
import { rescueIncidents, alertEvents, deliveryLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ── Event type definitions ────────────────────────────────────────────────────

export type FloodAlertRequestedEvent = {
  name: "flood/alert.requested";
  data: {
    alertEventId: string;
    to: string;
    subject: string;
    body: string;
  };
};

export type FloodRescueRequestedEvent = {
  name: "flood/rescue.requested";
  data: {
    incidentId: string;
    userId: string;
    userEmail: string;
    userName: string;
    lat: number;
    lng: number;
    city: string;
    country: string;
    description: string;
    severity: string;
  };
};

export type FloodRiskExtremeEvent = {
  name: "flood/risk.extreme";
  data: {
    assessmentId: string;
    locationId: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    riskLevel: string;
    reasoning: string;
    confidence: number;
  };
};

// ── 1. Send flood alert email (with retries + delivery log update) ────────────

export const sendFloodAlert = inngest.createFunction(
  { id: "flood-alert-send", retries: 3 },
  { event: "flood/alert.requested" },
  async ({ event, step }) => {
    const { alertEventId, to, subject, body } = event.data;

    const result = await step.run("send-email", async () => {
      const res = await sendEmail({ to, subject, body });
      if (!res.success) throw new Error(`Email failed: ${res.error}`);
      return res;
    });

    // Update delivery log + alert event status
    await step.run("update-delivery-status", async () => {
      if (!db) return;
      await db.insert(deliveryLogs).values({
        alertEventId,
        provider: "plunk",
        status: "success",
        responseCode: 200,
        responseBody: JSON.stringify(result),
      });
      await db
        .update(alertEvents)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(alertEvents.id, alertEventId));
    });

    return { success: true, alertEventId };
  },
);

// ── 2. Handle SOS rescue request → ack user → notify authority/NGO → update DB ─

export const handleRescueRequest = inngest.createFunction(
  { id: "rescue-request-handle", retries: 3 },
  { event: "flood/rescue.requested" },
  async ({ event, step }) => {
    const { incidentId, userEmail, userName, lat, lng, city, description, severity } =
      event.data;

    // Step A: Acknowledge user immediately
    await step.run("ack-user", async () => {
      const { subject, body } = buildRescueAckEmail({
        userName,
        incidentId,
        lat,
        lng,
        city: city || `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      });
      await sendEmail({ to: userEmail, subject, body });
    });

    // Step B: Notify all configured authority + NGO contacts
    const authorityEmails = (process.env.AUTHORITY_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const ngoEmails = (process.env.NGO_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const recipients = [...authorityEmails, ...ngoEmails];

    if (recipients.length > 0) {
      await step.run("notify-authorities", async () => {
        const { subject, body } = buildAuthorityAlertEmail({
          incidentId,
          userName,
          userEmail,
          lat,
          lng,
          city: city || "Unknown",
          description,
          severity,
        });
        const results = await Promise.allSettled(
          recipients.map((email) => sendEmail({ to: email, subject, body })),
        );
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length === recipients.length) {
          throw new Error(
            `All ${recipients.length} authority notification(s) failed — will retry`,
          );
        }
        return { sent: recipients.length - failures.length, failed: failures.length };
      });
    }

    // Step C: Mark incident as dispatched
    await step.run("mark-dispatched", async () => {
      if (!db) return;
      await db
        .update(rescueIncidents)
        .set({
          status: recipients.length > 0 ? "dispatched" : "pending_no_contacts",
          authorityNotifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(rescueIncidents.id, incidentId));
    });

    return {
      success: true,
      incidentId,
      authoritiesNotified: recipients.length,
    };
  },
);

// ── 3. Auto-escalate AI-detected extreme/high risk to authorities ─────────────

export const autoEscalateFloodRisk = inngest.createFunction(
  { id: "flood-risk-escalate", retries: 2 },
  { event: "flood/risk.extreme" },
  async ({ event, step }) => {
    const { assessmentId, city, country, lat, lng, riskLevel, reasoning, confidence } =
      event.data;

    const authorityEmails = (process.env.AUTHORITY_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (authorityEmails.length === 0) {
      // No authority contacts configured — skip silently (not an error to retry)
      throw new NonRetriableError("No AUTHORITY_EMAILS configured, skipping escalation");
    }

    await step.run("send-escalation-emails", async () => {
      const { subject, body } = buildAutoEscalationEmail({
        city,
        country,
        lat,
        lng,
        riskLevel,
        reasoning,
        confidence,
        assessmentId,
      });
      const results = await Promise.allSettled(
        authorityEmails.map((email) => sendEmail({ to: email, subject, body })),
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length === authorityEmails.length) {
        throw new Error("All escalation emails failed — will retry");
      }
    });

    return { escalated: true, assessmentId, riskLevel };
  },
);

// Export all functions for the serve handler
export const allFunctions = [sendFloodAlert, handleRescueRequest, autoEscalateFloodRisk];
