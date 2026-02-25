// ─── GET /api/cron/evaluate — Evaluate risk & send alerts ───
// Triggered by Vercel Cron every 6 hours, AFTER ingest completes.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  userLocations,
  forecastSnapshots,
  riskAssessments,
  alertEvents,
  deliveryLogs,
} from "@/lib/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import {
  evaluateFloodRisk,
  shouldSendAlert,
} from "@/lib/services/perplexity";
import {
  summarizeForecast,
  type OpenWeatherForecast,
} from "@/lib/services/openweather";
import { sendEmail, buildFloodAlertEmail } from "@/lib/services/plunk";

export const maxDuration = 120; // may take a while for many locations

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Get all active locations with their users
  const locations = await db
    .select({
      location: userLocations,
      user: users,
    })
    .from(userLocations)
    .innerJoin(users, eq(userLocations.userId, users.id))
    .where(
      and(eq(userLocations.isActive, true), eq(users.alertsEnabled, true)),
    );

  console.log(`[evaluate] Processing ${locations.length} location-user pairs`);

  const results = {
    total: locations.length,
    evaluated: 0,
    alertsSent: 0,
    alertsSuppressed: 0,
    errors: [] as string[],
  };

  for (const { location, user } of locations) {
    try {
      // Get latest forecast snapshot for this location
      const [latestSnapshot] = await db
        .select()
        .from(forecastSnapshots)
        .where(eq(forecastSnapshots.locationId, location.id))
        .orderBy(desc(forecastSnapshots.fetchedAt))
        .limit(1);

      if (!latestSnapshot) {
        results.errors.push(`No forecast for location ${location.id}`);
        continue;
      }

      // Summarize forecast for LLM
      const forecast = latestSnapshot.forecastData as unknown as OpenWeatherForecast;
      const summary = summarizeForecast(forecast);

      // Evaluate risk via Perplexity
      const risk = await evaluateFloodRisk({
        forecastSummary: summary,
        city: location.city ?? forecast.city?.name ?? "Unknown",
        country: location.country ?? forecast.city?.country ?? "Unknown",
        lat: location.lat,
        lng: location.lng,
      });

      // Store assessment
      const [assessment] = await db
        .insert(riskAssessments)
        .values({
          snapshotId: latestSnapshot.id,
          locationId: location.id,
          riskLevel: risk.riskLevel,
          confidence: risk.confidence,
          reasoning: risk.reasoning,
          leadTimeHours: risk.leadTimeHours,
          suggestedAction: risk.suggestedAction,
          rawLlmResponse: risk,
        })
        .returning();

      results.evaluated++;

      // Check if we should send an alert
      // Find last sent alert for this user+location
      const [lastAlert] = await db
        .select()
        .from(alertEvents)
        .where(
          and(
            eq(alertEvents.userId, user.id),
            eq(alertEvents.locationId, location.id),
            eq(alertEvents.status, "sent"),
          ),
        )
        .orderBy(desc(alertEvents.sentAt))
        .limit(1);

      const check = shouldSendAlert({
        riskLevel: risk.riskLevel,
        confidence: risk.confidence,
        userThreshold: user.severityThreshold,
        lastAlertSentAt: lastAlert?.sentAt ?? null,
      });

      if (!check.send) {
        console.log(
          `[evaluate] Suppressed alert for ${user.email} at ${location.label}: ${check.reason}`,
        );
        results.alertsSuppressed++;
        continue;
      }

      // Check quiet hours
      if (user.quietHoursStart != null && user.quietHoursEnd != null) {
        const nowHour = new Date().getUTCHours();
        const inQuiet =
          user.quietHoursStart <= user.quietHoursEnd
            ? nowHour >= user.quietHoursStart && nowHour < user.quietHoursEnd
            : nowHour >= user.quietHoursStart || nowHour < user.quietHoursEnd;
        if (inQuiet) {
          console.log(`[evaluate] Quiet hours for ${user.email}, suppressing`);
          results.alertsSuppressed++;
          continue;
        }
      }

      // Build & send email
      const { subject, body } = buildFloodAlertEmail({
        userName: user.name ?? "there",
        locationLabel: location.label,
        city: location.city ?? "your area",
        riskLevel: risk.riskLevel,
        reasoning: risk.reasoning,
        suggestedAction: risk.suggestedAction ?? "Stay alert and monitor conditions.",
        leadTimeHours: risk.leadTimeHours,
      });

      // Create dedup key for this forecast window (6h window)
      const window = Math.floor(Date.now() / (6 * 60 * 60 * 1000));
      const dedupKey = `${user.id}:${location.id}:${window}`;

      // Insert alert event
      let alertEvent;
      try {
        [alertEvent] = await db
          .insert(alertEvents)
          .values({
            assessmentId: assessment.id,
            userId: user.id,
            locationId: location.id,
            dedupKey,
            status: "pending",
            emailSubject: subject,
            emailBody: body,
          })
          .returning();
      } catch (err) {
        // Dedup key conflict → already alerted this window
        console.log(`[evaluate] Dedup hit for ${dedupKey}`);
        results.alertsSuppressed++;
        continue;
      }

      // Send via Plunk
      const emailResult = await sendEmail({
        to: user.email,
        subject,
        body,
      });

      // Log delivery
      await db.insert(deliveryLogs).values({
        alertEventId: alertEvent.id,
        provider: "plunk",
        status: emailResult.success ? "success" : "failed",
        responseCode: emailResult.statusCode ?? (emailResult.success ? 200 : 500),
        responseBody: JSON.stringify(emailResult),
      });

      // Update alert status
      await db
        .update(alertEvents)
        .set({
          status: emailResult.success ? "sent" : "failed",
          sentAt: emailResult.success ? new Date() : null,
        })
        .where(eq(alertEvents.id, alertEvent.id));

      if (emailResult.success) {
        results.alertsSent++;
        console.log(`[evaluate] Alert sent to ${user.email} for ${location.label}`);
      } else {
        results.errors.push(
          `Email failed for ${user.email}: ${emailResult.error}`,
        );
      }
    } catch (err) {
      results.errors.push(
        `Location ${location.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`[evaluate] Done:`, results);
  return NextResponse.json(results);
}
