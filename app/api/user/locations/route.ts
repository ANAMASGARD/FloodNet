// ─── CRUD: /api/user/locations ───
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userLocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function getDbUser(clerkId: string) {
  if (!db) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

// GET — list all locations for current user
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!db) return NextResponse.json({ locations: [] });

  const user = await getDbUser(clerkId);
  if (!user)
    return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const locations = await db
    .select()
    .from(userLocations)
    .where(eq(userLocations.userId, user.id));

  return NextResponse.json({ locations });
}

// POST — add a new saved location
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!db)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const user = await getDbUser(clerkId);
  if (!user)
    return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const body = await req.json();
  const { label, city, region, country, lat, lng } = body;

  if (!label || lat == null || lng == null) {
    return NextResponse.json(
      { error: "label, lat, and lng are required" },
      { status: 400 },
    );
  }

  const [location] = await db
    .insert(userLocations)
    .values({
      userId: user.id,
      label,
      city: city ?? null,
      region: region ?? null,
      country: country ?? null,
      lat,
      lng,
    })
    .returning();

  return NextResponse.json({ location }, { status: 201 });
}

// DELETE — remove a saved location by id (passed as query param)
export async function DELETE(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!db)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const user = await getDbUser(clerkId);
  if (!user)
    return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const locationId = req.nextUrl.searchParams.get("id");
  if (!locationId)
    return NextResponse.json({ error: "Location id required" }, { status: 400 });

  await db
    .delete(userLocations)
    .where(
      and(
        eq(userLocations.id, locationId),
        eq(userLocations.userId, user.id),
      ),
    );

  return NextResponse.json({ success: true });
}
