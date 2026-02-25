import arcjet, { shield, tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    // Protect against common attacks (SQL injection, XSS, etc.)
    shield({ mode: "LIVE" }),
    // Simple per-user rate limit: 5 requests per 15 seconds, max 10 burst
    tokenBucket({
      mode: "LIVE",
      characteristics: ["userId"], // rate limit per user
      refillRate: 5,  // refill 5 tokens every 15 seconds
      interval: 15,   // 15-second window
      capacity: 10,   // allow up to 10 requests in a burst
    }),
  ],
});

export async function GET(req: Request) {
  const { userId: clerkUserId } = await auth();

  const userId = clerkUserId ?? "anonymous";

  const decision = await aj.protect(req, { userId, requested: 1 });
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    return NextResponse.json(
      {
        error: "Too Many Requests — please wait a few seconds before trying again.",
        reason: decision.reason,
      },
      { status: 429 },
    );
  }

  return NextResponse.json({
    message: "Arcjet rate limit ok for this request",
    userId,
  });
}

