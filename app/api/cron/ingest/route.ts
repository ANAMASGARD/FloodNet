// ─── GET /api/cron/ingest — Fetch weather for all active locations ───
// Triggered by Vercel Cron every 6 hours.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userLocations, forecastSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchForecast } from "@/lib/services/openweather";

export const maxDuration = 60; // allow up to 60s for many locations

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent public access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Get all active locations
  const locations = await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.isActive, true));

  console.log(`[ingest] Processing ${locations.length} active locations`);

  const results = {
    total: locations.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Deduplicate by rough coordinates to avoid duplicate API calls
  // Round to 2 decimal places (~1km precision)
  const seen = new Map<string, typeof locations[0][]>();
  for (const loc of locations) {
    const key = `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(loc);
  }

  for (const [coordKey, locs] of seen) {
    try {
      const [lat, lng] = coordKey.split(",").map(Number);
      const forecast = await fetchForecast(lat, lng);

      // Store snapshot for each location at these coordinates
      for (const loc of locs) {
        await db.insert(forecastSnapshots).values({
          locationId: loc.id,
          lat: loc.lat,
          lng: loc.lng,
          forecastData: forecast,
        });
      }

      results.success += locs.length;
    } catch (err) {
      results.failed += locs.length;
      results.errors.push(
        `${coordKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`[ingest] Done:`, results);
  return NextResponse.json(results);
}
