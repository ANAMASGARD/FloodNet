// ─── GET /api/geocode?lat=...&lng=... — Reverse geocode coordinates to place name ───
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

interface GeocodeParts {
  city: string | null;
  region: string | null;
  country: string | null;
  displayName: string;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng query params required" },
      { status: 400 },
    );
  }

  try {
    // Use Mapbox reverse geocoding (free tier allows this)
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    if (!mapboxToken) {
      return NextResponse.json(
        { city: null, region: null, country: null, displayName: `${lat}, ${lng}` },
      );
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,region,country&limit=1`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { city: null, region: null, country: null, displayName: `${lat}, ${lng}` },
      );
    }

    const data = await res.json();
    const features = data.features ?? [];

    let city: string | null = null;
    let region: string | null = null;
    let country: string | null = null;

    // The first result's context contains place hierarchy
    const mainFeature = features[0];
    if (mainFeature) {
      // Check the feature itself
      if (mainFeature.place_type?.includes("place")) {
        city = mainFeature.text;
      }

      // Parse context for region and country
      const context = mainFeature.context ?? [];
      for (const ctx of context) {
        if (ctx.id?.startsWith("place") && !city) city = ctx.text;
        if (ctx.id?.startsWith("region")) region = ctx.text;
        if (ctx.id?.startsWith("country")) country = ctx.text;
      }
    }

    const parts = [city, region, country].filter(Boolean);
    const displayName = parts.length > 0 ? parts.join(", ") : `${lat}, ${lng}`;

    return NextResponse.json({ city, region, country, displayName });
  } catch {
    return NextResponse.json(
      { city: null, region: null, country: null, displayName: `${lat}, ${lng}` },
    );
  }
}
