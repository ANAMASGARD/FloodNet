'use client';

import React, { useState, useCallback } from 'react';
import { AlertTriangle, X, MapPin, Send, Loader, ThumbsUp, Megaphone } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export interface CommunityReport {
  id: string;
  lat: number;
  lng: number;
  reportType: string;
  severity: string;
  description: string | null;
  confirmCount: number;
  createdAt: string;
}

interface Props {
  userLocation?: { lat: number; lng: number; city: string } | null;
  onReportSubmitted?: (report: CommunityReport) => void;
  asNavItem?: boolean;
}

const REPORT_TYPES = [
  { value: 'flooding', label: 'Flooding', icon: '🌊', desc: 'Active flooding in area' },
  { value: 'road_blocked', label: 'Road Blocked', icon: '🚧', desc: 'Road impassable' },
  { value: 'power_out', label: 'Power Out', icon: '⚡', desc: 'Power outage' },
  { value: 'needs_rescue', label: 'Needs Rescue', icon: '🆘', desc: 'People need rescue' },
  { value: 'water_rising', label: 'Water Rising', icon: '📈', desc: 'Water levels increasing' },
  { value: 'safe_passage', label: 'Safe Passage', icon: '✅', desc: 'Route is passable' },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'moderate', label: 'Moderate', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
] as const;

export default function CommunityReportPanel({ userLocation, onReportSubmitted, asNavItem }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('moderate');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }
    if (!userLocation) {
      toast.error('Location not available. Please allow location access.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/api/community-reports', {
        lat: userLocation.lat,
        lng: userLocation.lng,
        reportType,
        severity,
        description: description.trim() || undefined,
      });

      toast.success('Report submitted! Others nearby will see it.');
      onReportSubmitted?.(res.data.report);
      setIsOpen(false);
      setReportType('');
      setSeverity('moderate');
      setDescription('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }, [reportType, severity, description, userLocation, onReportSubmitted]);

  if (!isOpen) {
    if (asNavItem) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-500/30 text-left transition-all"
        >
          <Megaphone className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <p className="font-head text-sm">Community Report</p>
            <p className="text-[10px] text-muted-foreground">Flag flooding or hazards</p>
          </div>
        </button>
      );
    }
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-head px-3 py-1.5 rounded-lg transition-all"
      >
        <AlertTriangle className="w-3 h-3" />
        Report
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border-2 border-black rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="font-head text-lg">Community Report</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-lg border-2 border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Location */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border-2 border-border">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs text-muted-foreground">
              {userLocation ? `${userLocation.city} (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})` : 'Location not available'}
            </span>
          </div>

          {/* Report Type */}
          <div>
            <label className="text-xs font-head text-muted-foreground mb-2 block">What are you reporting?</label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setReportType(t.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                    reportType === t.value
                      ? 'bg-primary text-primary-foreground border-black shadow-md'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <div>
                    <p className="font-head text-xs">{t.label}</p>
                    <p className="text-[9px] opacity-70">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs font-head text-muted-foreground mb-2 block">Severity</label>
            <div className="flex gap-1.5">
              {SEVERITY_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-head transition-all ${
                    severity === s.value
                      ? `${s.color} text-white border-black`
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${severity === s.value ? 'bg-white/50' : s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-head text-muted-foreground mb-2 block">Details (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's happening? Water level, road conditions, etc."
              className="w-full min-h-[60px] max-h-24 bg-muted/50 border-2 border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
              maxLength={280}
            />
            <p className="text-[9px] text-muted-foreground text-right">{description.length}/280</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-border">
          <button
            onClick={handleSubmit}
            disabled={!reportType || !userLocation || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-head text-sm bg-primary hover:bg-primary-hover text-primary-foreground border-2 border-black shadow-md hover:shadow-sm hover:translate-y-0.5 active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit Report</>
            )}
          </button>
          <p className="text-[9px] text-muted-foreground text-center mt-2">
            Reports expire after 6 hours. Others can confirm your report.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Compact report card for displaying in lists ──
export function ReportCard({ report, onConfirm }: { report: CommunityReport; onConfirm?: (id: string) => void }) {
  const typeInfo = REPORT_TYPES.find(t => t.value === report.reportType);
  const sevInfo = SEVERITY_OPTIONS.find(s => s.value === report.severity);
  const age = Math.round((Date.now() - new Date(report.createdAt).getTime()) / 60000);
  const ageStr = age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`;

  return (
    <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-xl border-2">
      <span className="text-lg">{typeInfo?.icon || '📍'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-head text-xs">{typeInfo?.label || report.reportType}</span>
          <span className={`w-2 h-2 rounded-full ${sevInfo?.color || 'bg-gray-400'}`} />
          <span className="text-[9px] text-muted-foreground">{ageStr}</span>
        </div>
        {report.description && (
          <p className="text-[10px] text-muted-foreground truncate">{report.description}</p>
        )}
      </div>
      {onConfirm && (
        <button
          onClick={() => onConfirm(report.id)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border-2 border-border hover:bg-muted text-xs transition-colors"
          title="Confirm this report"
        >
          <ThumbsUp className="w-3 h-3" />
          <span className="text-[10px] font-head">{report.confirmCount}</span>
        </button>
      )}
    </div>
  );
}
