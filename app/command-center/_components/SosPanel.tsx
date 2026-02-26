'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Radio, PhoneCall } from 'lucide-react';

interface SosPanelProps {
  userLocation: { lat: number; lng: number; city: string } | null;
  plan: { location: string; center_coordinates?: { latitude: number; longitude: number } } | null;
}

type IncidentStatus = 'idle' | 'confirming' | 'submitting' | 'pending' | 'dispatched' | 'pending_no_contacts' | 'error';

export default function SosPanel({ userLocation, plan }: SosPanelProps) {
  const [status,     setStatus]     = useState<IncidentStatus>('idle');
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [notifiedAt, setNotifiedAt] = useState<string | null>(null);

  // Poll incident status every 5 seconds while pending
  useEffect(() => {
    if (!incidentId || status === 'dispatched') return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/emergency/request?id=${incidentId}`);
        if (!r.ok) return;
        const data = await r.json();
        setStatus(data.status as IncidentStatus);
        if (data.authorityNotifiedAt) {
          setNotifiedAt(new Date(data.authorityNotifiedAt).toLocaleTimeString());
        }
      } catch { /* keep polling */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [incidentId, status]);

  const submit = useCallback(async () => {
    const lat = userLocation?.lat ?? plan?.center_coordinates?.latitude;
    const lng = userLocation?.lng ?? plan?.center_coordinates?.longitude;
    const city = userLocation?.city ?? plan?.location ?? 'Unknown location';

    if (!lat || !lng) {
      setErrorMsg('Location not detected. Please allow browser location access first.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const r = await fetch('/api/emergency/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, city, description, locationLabel: city }),
      });
      const data = await r.json();

      if (!r.ok) {
        setErrorMsg(data.error ?? 'Failed to submit request');
        setStatus('error');
        return;
      }

      setIncidentId(data.incidentId);
      setStatus(data.status ?? 'pending');
    } catch (e) {
      setErrorMsg('Network error — please try again');
      setStatus('error');
    }
  }, [userLocation, plan, description]);

  const reset = () => {
    setStatus('idle');
    setIncidentId(null);
    setDescription('');
    setErrorMsg('');
    setNotifiedAt(null);
  };

  // ── Idle state ─────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="border-2 border-red-500/30 rounded-2xl p-4 bg-red-500/5 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot" />
          <span className="font-head text-sm text-red-500">Emergency Rescue</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          In immediate danger from flooding? Submit a rescue request — authorities and NGOs will be notified with your GPS location.
        </p>
        <button
          onClick={() => setStatus('confirming')}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-head text-sm py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-600/30"
        >
          <Radio className="w-4 h-4" />
          🆘 Request Emergency Rescue
        </button>
      </div>
    );
  }

  // ── Confirmation dialog ────────────────────────────────────────────────────
  if (status === 'confirming') {
    return (
      <div className="border-2 border-red-500/50 rounded-2xl p-4 bg-red-500/5 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="font-head text-sm">Confirm Rescue Request</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Your GPS coordinates and contact details will be sent immediately to emergency responders.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your situation: number of people, injuries, water level, landmarks nearby…"
          className="w-full text-xs rounded-xl border-2 bg-background p-3 resize-none h-20 mb-3 focus:outline-none focus:border-red-500"
        />
        <div className="flex gap-2">
          <button
            onClick={submit}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-head text-sm py-2.5 rounded-xl transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Send SOS
          </button>
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-xl border-2 text-sm font-head hover:bg-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Submitting ─────────────────────────────────────────────────────────────
  if (status === 'submitting') {
    return (
      <div className="border-2 border-orange-500/30 rounded-2xl p-4 bg-orange-500/5 shadow-md flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
        <div>
          <p className="font-head text-sm">Submitting rescue request…</p>
          <p className="text-xs text-muted-foreground">Notifying emergency services</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="border-2 border-red-500/30 rounded-2xl p-4 bg-red-500/5 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="font-head text-sm text-red-500">Submission failed</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{errorMsg}</p>
        <button onClick={reset} className="w-full text-sm font-head py-2 rounded-xl border-2 hover:bg-muted transition-all">
          Try again
        </button>
      </div>
    );
  }

  // ── Dispatched / Pending ───────────────────────────────────────────────────
  const isDispatched = status === 'dispatched' || status === 'pending_no_contacts';

  return (
    <div className={`border-2 rounded-2xl p-4 shadow-md ${isDispatched ? 'border-green-500/40 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
      <div className="flex items-center gap-2 mb-3">
        {isDispatched ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
        )}
        <span className={`font-head text-sm ${isDispatched ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
          {isDispatched ? 'Rescue request dispatched' : 'Request submitted — notifying…'}
        </span>
      </div>

      {incidentId && (
        <div className="bg-muted/50 rounded-xl p-3 mb-3 border-2">
          <p className="text-[10px] text-muted-foreground mb-0.5">Incident ID</p>
          <p className="font-head text-sm tracking-widest">{incidentId.slice(0, 8).toUpperCase()}</p>
        </div>
      )}

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
        {isDispatched ? (
          <>
            <p>✅ Acknowledgement sent to your email</p>
            {notifiedAt
              ? <p>✅ Authorities notified at {notifiedAt}</p>
              : <p>✅ Emergency services notified</p>
            }
            <p>📍 Your GPS coordinates have been shared</p>
          </>
        ) : (
          <>
            <p>✅ Request received</p>
            <p className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Notifying emergency services…</p>
          </>
        )}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-3">
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          💡 <strong>While you wait:</strong> Move to higher ground · Stay visible · Conserve battery · Signal rescuers
        </p>
      </div>

      {isDispatched && (
        <button onClick={reset} className="w-full text-xs font-head py-2 rounded-xl border-2 hover:bg-muted transition-all text-muted-foreground">
          Submit another request
        </button>
      )}
    </div>
  );
}
