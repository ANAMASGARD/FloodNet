import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityReports } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
//  Community Flood Reports API
//  GET  — fetch active reports near a location (within ~50km)
//  POST — submit a new community report
//  PATCH — confirm (upvote) an existing report
// ═══════════════════════════════════════════════════════════════

const REPORT_TYPES = ['flooding', 'road_blocked', 'power_out', 'needs_rescue', 'water_rising', 'safe_passage'] as const;
const SEVERITY_LEVELS = ['low', 'moderate', 'high', 'critical'] as const;
const EXPIRY_HOURS = 6;

// GET /api/community-reports?lat=X&lng=Y&radius=0.5
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '0.5'); // degrees (~55km per degree)

    if (!lat && !lng) {
      // Return all active reports if no location given
      const reports = await db
        .select()
        .from(communityReports)
        .where(
          and(
            eq(communityReports.isActive, true),
            gte(communityReports.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(communityReports.createdAt))
        .limit(100);

      return NextResponse.json({ reports });
    }

    // Bounding box query (simple but fast)
    const reports = await db
      .select()
      .from(communityReports)
      .where(
        and(
          eq(communityReports.isActive, true),
          gte(communityReports.expiresAt, new Date()),
          gte(communityReports.lat, lat - radius),
          gte(sql`${lat + radius}`, communityReports.lat),
          gte(communityReports.lng, lng - radius),
          gte(sql`${lng + radius}`, communityReports.lng),
        ),
      )
      .orderBy(desc(communityReports.createdAt))
      .limit(100);

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('[CommunityReports] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// POST /api/community-reports
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { lat, lng, reportType, severity, description } = body;

    if (!lat || !lng || !reportType) {
      return NextResponse.json({ error: 'lat, lng, and reportType are required' }, { status: 400 });
    }

    if (!REPORT_TYPES.includes(reportType)) {
      return NextResponse.json({ error: `reportType must be one of: ${REPORT_TYPES.join(', ')}` }, { status: 400 });
    }

    if (severity && !SEVERITY_LEVELS.includes(severity)) {
      return NextResponse.json({ error: `severity must be one of: ${SEVERITY_LEVELS.join(', ')}` }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    const [report] = await db
      .insert(communityReports)
      .values({
        clerkId: userId,
        lat,
        lng,
        reportType,
        severity: severity || 'moderate',
        description: description || null,
        expiresAt,
      })
      .returning();

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: any) {
    console.error('[CommunityReports] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}

// PATCH /api/community-reports (confirm/upvote)
export async function PATCH(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportId } = body;

    if (!reportId) return NextResponse.json({ error: 'reportId is required' }, { status: 400 });

    const [updated] = await db
      .update(communityReports)
      .set({ confirmCount: sql`${communityReports.confirmCount} + 1` })
      .where(eq(communityReports.id, reportId))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    return NextResponse.json({ report: updated });
  } catch (error: any) {
    console.error('[CommunityReports] PATCH error:', error?.message);
    return NextResponse.json({ error: 'Failed to confirm report' }, { status: 500 });
  }
}
