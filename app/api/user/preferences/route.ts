// ─── GET/PATCH: /api/user/preferences ───
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET — current user preferences
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!db)
    return NextResponse.json({ preferences: { alertsEnabled: true, quietHoursStart: null, quietHoursEnd: null, severityThreshold: "moderate" } });

  const [user] = await db
    .select({
      alertsEnabled: users.alertsEnabled,
      quietHoursStart: users.quietHoursStart,
      quietHoursEnd: users.quietHoursEnd,
      severityThreshold: users.severityThreshold,
    })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user)
    return NextResponse.json({ error: "User not synced" }, { status: 404 });

  return NextResponse.json({ preferences: user });
}

// PATCH — update preferences
export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!db)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await req.json();
  const allowed = ["alertsEnabled", "quietHoursStart", "quietHoursEnd", "severityThreshold"];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.clerkId, clerkId))
    .returning({
      alertsEnabled: users.alertsEnabled,
      quietHoursStart: users.quietHoursStart,
      quietHoursEnd: users.quietHoursEnd,
      severityThreshold: users.severityThreshold,
    });

  return NextResponse.json({ preferences: updated });
}
