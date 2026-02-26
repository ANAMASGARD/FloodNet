import { db } from '@/lib/db';
import { rescueIncidents, communityReports, alertEvents, riskAssessments, users } from '@/lib/db/schema';
import { desc, eq, gte, and, sql, count } from 'drizzle-orm';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
//  FloodNet Ops Center — Read-only authority dashboard
//  Server-rendered, queries DB directly. No client JS needed.
// ═══════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

export default async function OpsCenter() {
  if (!db) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-head">Database not configured</p>
      </div>
    );
  }

  // ── Parallel data fetches ──
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    activeIncidents,
    resolvedIncidentsCount,
    activeReports,
    recentAlerts,
    totalUsers,
    recentRiskAssessments,
  ] = await Promise.all([
    // Active SOS incidents (not resolved/cancelled)
    db.select().from(rescueIncidents)
      .where(and(
        sql`${rescueIncidents.status} NOT IN ('resolved', 'cancelled')`,
      ))
      .orderBy(desc(rescueIncidents.createdAt))
      .limit(20),

    // Resolved incidents in last 24h
    db.select({ count: count() }).from(rescueIncidents)
      .where(and(
        eq(rescueIncidents.status, 'resolved'),
        gte(rescueIncidents.resolvedAt, twentyFourHoursAgo),
      )),

    // Active community reports
    db.select().from(communityReports)
      .where(and(
        eq(communityReports.isActive, true),
        gte(communityReports.expiresAt, now),
      ))
      .orderBy(desc(communityReports.createdAt))
      .limit(50),

    // Recent alert events
    db.select().from(alertEvents)
      .orderBy(desc(alertEvents.createdAt))
      .limit(10),

    // Total users
    db.select({ count: count() }).from(users),

    // Recent risk assessments
    db.select().from(riskAssessments)
      .orderBy(desc(riskAssessments.evaluatedAt))
      .limit(10),
  ]);

  // ── Compute stats ──
  const stats: StatCard[] = [
    {
      label: 'Active SOS',
      value: activeIncidents.length,
      icon: '🆘',
      color: activeIncidents.length > 0 ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10',
    },
    {
      label: 'Resolved (24h)',
      value: resolvedIncidentsCount[0]?.count ?? 0,
      icon: '✅',
      color: 'border-green-500 bg-green-500/10',
    },
    {
      label: 'Community Reports',
      value: activeReports.length,
      icon: '📢',
      color: activeReports.length > 0 ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-500 bg-gray-500/5',
    },
    {
      label: 'Total Users',
      value: totalUsers[0]?.count ?? 0,
      icon: '👥',
      color: 'border-blue-500 bg-blue-500/10',
    },
    {
      label: 'Alerts Sent',
      value: recentAlerts.length,
      icon: '📧',
      color: 'border-purple-500 bg-purple-500/10',
    },
    {
      label: 'Risk Scans',
      value: recentRiskAssessments.length,
      icon: '🔍',
      color: 'border-indigo-500 bg-indigo-500/10',
    },
  ];

  const severityColor: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    moderate: 'bg-yellow-400 text-black',
    low: 'bg-green-500 text-white',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    dispatched: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    pending_no_contacts: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    resolved: 'bg-green-500/10 text-green-600 border-green-500/30',
    cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  };

  const reportTypeIcon: Record<string, string> = {
    flooding: '🌊', road_blocked: '🚧', power_out: '⚡',
    needs_rescue: '🆘', water_rising: '📈', safe_passage: '✅',
  };

  function timeAgo(date: Date | string): string {
    const ms = Date.now() - new Date(date).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/command-center" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span className="text-xs font-head hidden sm:inline">Command Center</span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 pulse-dot" />
              <h1 className="font-head text-base tracking-wide">Ops Center</h1>
              <span className="text-xs text-muted-foreground hidden sm:inline">Authority Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              Last refresh: {now.toLocaleTimeString()}
            </span>
            <Link
              href="/ops-center"
              className="text-xs font-head px-3 py-1.5 rounded-lg border-2 border-border hover:bg-muted transition-colors"
            >
              ↻ Refresh
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`border-2 rounded-2xl p-4 shadow-md ${s.color}`}>
              <span className="text-2xl">{s.icon}</span>
              <p className="font-head text-2xl mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Active SOS Incidents ── */}
          <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🆘</span>
                <h2 className="font-head text-lg">Active SOS Incidents</h2>
              </div>
              {activeIncidents.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-head bg-red-500 text-white animate-pulse">
                  {activeIncidents.length} ACTIVE
                </span>
              )}
            </div>

            {activeIncidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-head">No active incidents</p>
                <p className="text-xs">All clear</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activeIncidents.map(inc => (
                  <div key={inc.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border-2">
                    <div className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-head border ${statusColor[inc.status] || ''}`}>
                      {inc.status}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-head text-sm truncate">{inc.userName || inc.userEmail}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(inc.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        📍 {inc.city || inc.locationLabel || `${inc.lat.toFixed(3)}, ${inc.lng.toFixed(3)}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{inc.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-head ${severityColor[inc.severity] || 'bg-gray-500 text-white'}`}>
                          {inc.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Community Reports Feed ── */}
          <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h2 className="font-head text-lg">Community Reports</h2>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {activeReports.length} active
              </span>
            </div>

            {activeReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-3xl mb-2">🔇</p>
                <p className="text-sm font-head">No active reports</p>
                <p className="text-xs">No community reports in area</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activeReports.map(rpt => (
                  <div key={rpt.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border-2">
                    <span className="text-lg shrink-0">{reportTypeIcon[rpt.reportType] || '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-head text-sm capitalize">{rpt.reportType.replace('_', ' ')}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(rpt.createdAt)}</span>
                      </div>
                      {rpt.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{rpt.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-head ${severityColor[rpt.severity] || 'bg-gray-500 text-white'}`}>
                          {rpt.severity}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          📍 {rpt.lat.toFixed(3)}, {rpt.lng.toFixed(3)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">👍 {rpt.confirmCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Risk Assessments ── */}
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔍</span>
            <h2 className="font-head text-lg">Recent Risk Assessments</h2>
          </div>

          {recentRiskAssessments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No risk assessments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-2 px-3 font-head text-xs text-muted-foreground">Risk Level</th>
                    <th className="text-left py-2 px-3 font-head text-xs text-muted-foreground">Confidence</th>
                    <th className="text-left py-2 px-3 font-head text-xs text-muted-foreground">Lead Time</th>
                    <th className="text-left py-2 px-3 font-head text-xs text-muted-foreground">Action</th>
                    <th className="text-left py-2 px-3 font-head text-xs text-muted-foreground">Evaluated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRiskAssessments.map(ra => (
                    <tr key={ra.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-head ${severityColor[ra.riskLevel] || 'bg-gray-500 text-white'}`}>
                          {ra.riskLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs">{(ra.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2.5 px-3 text-xs">{ra.leadTimeHours ? `${ra.leadTimeHours}h` : '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground truncate max-w-[200px]">{ra.suggestedAction || '—'}</td>
                      <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{timeAgo(ra.evaluatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Alerts ── */}
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📧</span>
            <h2 className="font-head text-lg">Recent Alert Events</h2>
          </div>

          {recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No alerts sent yet</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map(al => (
                <div key={al.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-head border ${
                    al.status === 'sent' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                    al.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
                    al.status === 'failed' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                    'bg-gray-500/10 text-gray-600 border-gray-500/30'
                  }`}>
                    {al.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-head text-xs truncate">{al.emailSubject || 'Alert'}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(al.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground text-center pb-4">
          FloodNet Ops Center · Server-rendered at {now.toISOString()} · Data auto-refreshes on page load
        </p>
      </main>
    </div>
  );
}
