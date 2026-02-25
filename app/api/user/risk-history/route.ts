// ─── GET /api/user/risk-history — Recent risk assessments for user's locations ───
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userLocations, riskAssessments } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) return NextResponse.json({ assessments: [] });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not synced" }, { status: 404 });
  }

  // Get all locations with their latest risk assessment
  const locations = await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.userId, user.id));

  const result = [];

  for (const loc of locations) {
    const [latestRisk] = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.locationId, loc.id))
      .orderBy(desc(riskAssessments.evaluatedAt))
      .limit(1);

    result.push({
      location: {
        id: loc.id,
        label: loc.label,
        city: loc.city,
        lat: loc.lat,
        lng: loc.lng,
      },
      risk: latestRisk
        ? {
            riskLevel: latestRisk.riskLevel,
            confidence: latestRisk.confidence,
            reasoning: latestRisk.reasoning,
            leadTimeHours: latestRisk.leadTimeHours,
            suggestedAction: latestRisk.suggestedAction,
            evaluatedAt: latestRisk.evaluatedAt,
          }
        : null,
    });
  }

  return NextResponse.json({ assessments: result });
}
