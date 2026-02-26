// ─── POST /api/emergency/request — Submit a rescue SOS request ─────────────
// Creates a rescueIncident record and fires the flood/rescue.requested event
// through Inngest, which handles user acknowledgement + authority dispatch.
//
// ─── GET /api/emergency/request?id=<incidentId> — Poll incident status ──────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { rescueIncidents, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { classifyRescueSeverity } from "@/lib/services/policy";

// ── POST: create incident ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db)      return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await req.json();
  const {
    lat,
    lng,
    city     = "",
    country  = "",
    locationLabel = "",
    description   = "Emergency rescue requested",
  } = body as {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
    locationLabel?: string;
    description?: string;
  };

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng are required numbers" }, { status: 400 });
  }

  // Look up user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found — sync first" }, { status: 404 });

  // Auto-classify severity from description text
  const severity = classifyRescueSeverity(description);

  // Create incident record
  const [incident] = await db
    .insert(rescueIncidents)
    .values({
      userId:        user.id,
      lat,
      lng,
      city:          city  || null,
      country:       country || null,
      locationLabel: locationLabel || null,
      description,
      severity,
      userEmail: user.email,
      userName:  user.name ?? "FloodNet User",
      status: "pending",
    })
    .returning();

  // Fire Inngest event — orchestrates ack + authority dispatch (with retries)
  // Wrapped in try-catch: incident is always created even if Inngest is not yet configured
  try {
    const inngestEvents = await inngest.send({
      name: "flood/rescue.requested",
      data: {
        incidentId: incident.id,
        userId:     user.id,
        userEmail:  user.email,
        userName:   user.name ?? "FloodNet User",
        lat,
        lng,
        city:        city    || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        country:     country || "",
        description,
        severity,
      },
    });

    // Store Inngest event id for traceability
    const inngestEventId = Array.isArray(inngestEvents)
      ? (inngestEvents[0] as any)?.id
      : (inngestEvents as any)?.ids?.[0];

    if (inngestEventId) {
      await db
        .update(rescueIncidents)
        .set({ inngestEventId })
        .where(eq(rescueIncidents.id, incident.id));
    }
  } catch (inngestErr) {
    // Non-fatal: log and continue — incident is saved, manual dispatch is still possible
    console.warn("[rescue] Inngest event send failed (configure INNGEST_EVENT_KEY):", (inngestErr as Error).message);
  }

  return NextResponse.json({
    incidentId: incident.id,
    status:     incident.status,
    severity,
    message:    "Rescue request submitted. Authorities are being notified.",
  });
}

// ── GET: poll incident status ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db)      return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

  const [incident] = await db
    .select()
    .from(rescueIncidents)
    .where(eq(rescueIncidents.id, id))
    .limit(1);

  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  return NextResponse.json({
    id:                  incident.id,
    status:              incident.status,
    severity:            incident.severity,
    city:                incident.city,
    lat:                 incident.lat,
    lng:                 incident.lng,
    description:         incident.description,
    authorityNotifiedAt: incident.authorityNotifiedAt,
    createdAt:           incident.createdAt,
  });
}
