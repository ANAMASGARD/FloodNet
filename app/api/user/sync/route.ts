// ─── POST /api/user/sync — Syncs Clerk user to DB on first load ───
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured", user: null }, { status: 200 });
  }

  // Check if already synced
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ user: existing[0] });
  }

  // Fetch full profile from Clerk
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;

  const [newUser] = await db
    .insert(users)
    .values({ clerkId, email, name })
    .returning();

  return NextResponse.json({ user: newUser }, { status: 201 });
}
