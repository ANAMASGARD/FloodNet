'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, TriangleAlert, MapPin, Loader2, Shield, Phone, Clock, Waves } from 'lucide-react';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { AlertTriangle, CheckCircle2, Radio, PhoneCall } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type IncidentStatus = 'idle' | 'confirming' | 'submitting' | 'pending' | 'dispatched' | 'pending_no_contacts' | 'error';

// ── Emergency Rescue Page ─────────────────────────────────────────────────────
export default function EmergencyPage() {
  const { isLoaded, isSignedIn } = useUser();

  // GPS state
  const [gpsLat, setGpsLat]       = useState<number | null>(null);
  const [gpsLng, setGpsLng]       = useState<number | null>(null);
  const [gpsCity, setGpsCity]     = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]   = useState<string | null>(null);

  // SOS state
  const [status,      setStatus]      = useState<IncidentStatus>('idle');
  const [incidentId,  setIncidentId]  = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [notifiedAt,  setNotifiedAt]  = useState<string | null>(null);

  // Auto-detect GPS on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator?.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsLat(latitude);
        setGpsLng(longitude);
        setGpsLoading(false);
        try {
          const r = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`);
          if (r.ok) {
            const d = await r.json();
            setGpsCity(d.city ?? d.placeName ?? `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
          }
        } catch { /* ignore reverse-geocode failure */ }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) setGpsError('Location permission denied. Please enable location access in your browser settings.');
        else setGpsError('Could not detect your location automatically.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Poll incident status
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
    if (!gpsLat || !gpsLng) {
      setErrorMsg('Location not detected. Please allow browser location access.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const r = await fetch('/api/emergency/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: gpsLat, lng: gpsLng,
          city: gpsCity, locationLabel: gpsCity,
          description,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErrorMsg(data.error ?? 'Failed to submit request');
        setStatus('error');
        return;
      }
      setIncidentId(data.incidentId);
      setStatus(data.status ?? 'pending');
    } catch {
      setErrorMsg('Network error — please try again');
      setStatus('error');
    }
  }, [gpsLat, gpsLng, gpsCity, description]);

  const reset = () => {
    setStatus('idle');
    setIncidentId(null);
    setDescription('');
    setErrorMsg('');
    setNotifiedAt(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Top Nav Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b-2 border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + back */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-head hidden sm:inline">Home</span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot" />
              <span className="font-head text-base tracking-wide">FloodNet</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              className="text-xs font-head px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Home
            </Link>
            <Link
              href="/command-center"
              className="text-xs font-head px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Command Center
            </Link>
            <Link
              href="/emergency"
              className="text-xs font-head px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
            >
              🆘 Emergency
            </Link>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {isLoaded && (
              isSignedIn ? (
                <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
              ) : (
                <SignInButton mode="modal">
                  <button className="text-xs font-head px-3 py-1.5 rounded-lg border-2 hover:bg-muted transition-all">
                    Sign In
                  </button>
                </SignInButton>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12">

        {/* Hero text */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
            <span className="text-xs font-head text-red-500 uppercase tracking-widest">Emergency Services</span>
          </div>
          <h1 className="font-head text-3xl sm:text-4xl md:text-5xl tracking-tight mb-3">
            Emergency Rescue Request
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            If you or someone near you is in immediate danger from flooding, submit a rescue request.
            Authorities and NGOs will be notified instantly with your GPS coordinates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* ── Left: Info + GPS ──────────────────────────────────────── */}
          <div className="md:col-span-2 space-y-4">

            {/* GPS Status card */}
            <div className="border-2 border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-head text-sm">Your Location</span>
              </div>
              {gpsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Detecting GPS…</span>
                </div>
              ) : gpsLat && gpsLng ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-head text-green-600 dark:text-green-400">Location detected</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {gpsCity || `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">
                    {gpsLat.toFixed(5)}°N, {gpsLng.toFixed(5)}°E
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-red-500">No GPS signal</span>
                  </div>
                  {gpsError && <p className="text-xs text-muted-foreground">{gpsError}</p>}
                  <button
                    onClick={() => {
                      setGpsError(null);
                      setGpsLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => { setGpsLat(pos.coords.latitude); setGpsLng(pos.coords.longitude); setGpsLoading(false); },
                        () => { setGpsLoading(false); setGpsError('Location permission denied.'); }
                      );
                    }}
                    className="text-xs font-head px-3 py-1.5 rounded-lg border-2 hover:bg-muted transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Process steps */}
            <div className="border-2 border-border rounded-2xl p-4">
              <p className="font-head text-sm mb-3">What happens next</p>
              <ol className="space-y-3">
                {[
                  { icon: <Radio className="w-3.5 h-3.5" />, label: 'SOS submitted', desc: 'Your request + GPS sent to our system' },
                  { icon: <Phone className="w-3.5 h-3.5" />, label: 'Authorities alerted', desc: 'Email dispatched to district emergency services + NGOs' },
                  { icon: <Shield className="w-3.5 h-3.5" />, label: 'Rescue dispatched', desc: 'Responders navigate to your coordinates' },
                  { icon: <Clock className="w-3.5 h-3.5" />, label: 'Status updates', desc: 'This page auto-updates every 5 seconds' },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full border-2 border-border flex items-center justify-center shrink-0 text-muted-foreground">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-xs font-head">{step.label}</p>
                      <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Safety tips */}
            <div className="border-2 border-yellow-500/30 bg-yellow-500/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TriangleAlert className="w-4 h-4 text-yellow-500" />
                <span className="font-head text-xs text-yellow-600 dark:text-yellow-400">While you wait</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Move to highest available ground immediately</li>
                <li>• Stay visible — use bright clothing or torch</li>
                <li>• Conserve phone battery (reduce brightness)</li>
                <li>• Signal rescuers with noise or light</li>
                <li>• Do NOT enter moving floodwater</li>
              </ul>
            </div>
          </div>

          {/* ── Right: SOS Panel ─────────────────────────────────────── */}
          <div className="md:col-span-3">
            {!isLoaded ? (
              <div className="border-2 border-border rounded-2xl p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !isSignedIn ? (
              /* Not signed in — prompt */
              <div className="border-2 border-red-500/30 rounded-2xl p-8 bg-red-500/5 text-center">
                <Waves className="w-10 h-10 text-red-400 mx-auto mb-4" />
                <h2 className="font-head text-lg mb-2">Sign in to request rescue</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Authentication is required so emergency services can identify you and follow up after rescue.
                </p>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-head text-sm py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-600/30">
                    <Radio className="w-4 h-4" />
                    Sign In &amp; Request Rescue
                  </button>
                </SignInButton>
              </div>
            ) : (
              /* Signed in — show SOS form / status */
              <SosForm
                status={status}
                incidentId={incidentId}
                description={description}
                errorMsg={errorMsg}
                notifiedAt={notifiedAt}
                hasGps={!!(gpsLat && gpsLng)}
                onDescriptionChange={setDescription}
                onSubmit={() => setStatus('confirming')}
                onConfirm={submit}
                onReset={reset}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="border-t-2 border-border py-4 text-center">
        <p className="text-xs text-muted-foreground">
          FloodNet · AI Flood Resilience Network · For emergencies requiring immediate dispatch, also call your local emergency number.
        </p>
      </footer>
    </div>
  );
}

// ── Inline SOS form (extracted to keep parent manageable) ─────────────────────
interface SosFormProps {
  status: IncidentStatus;
  incidentId: string | null;
  description: string;
  errorMsg: string;
  notifiedAt: string | null;
  hasGps: boolean;
  onDescriptionChange: (v: string) => void;
  onSubmit: () => void;
  onConfirm: () => void;
  onReset: () => void;
}

function SosForm({
  status, incidentId, description, errorMsg, notifiedAt, hasGps,
  onDescriptionChange, onSubmit, onConfirm, onReset,
}: SosFormProps) {

  if (status === 'idle') return (
    <div className="border-2 border-red-500/40 rounded-2xl p-6 bg-red-500/5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500 pulse-dot" />
        <span className="font-head text-base text-red-500">Emergency Rescue</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        In immediate danger from flooding? Submit a rescue request — authorities and NGOs will be
        notified instantly with your GPS location.
      </p>

      {!hasGps && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            ⚠️ GPS not detected yet. Please allow location access in your browser for accurate rescue dispatch.
          </p>
        </div>
      )}

      <button
        onClick={onSubmit}
        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-head text-base py-4 px-4 rounded-xl transition-all shadow-lg shadow-red-600/30"
      >
        <Radio className="w-5 h-5" />
        🆘 Request Emergency Rescue
      </button>

      <p className="text-[11px] text-muted-foreground text-center mt-3">
        This will immediately alert district authorities and registered NGOs with your GPS coordinates.
      </p>
    </div>
  );

  if (status === 'confirming') return (
    <div className="border-2 border-red-500/50 rounded-2xl p-6 bg-red-500/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="font-head text-base">Confirm Rescue Request</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Emergency responders will receive your name, email, GPS coordinates, and the description below.
        This is intended for life-threatening flood emergencies only.
      </p>
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Describe your situation: number of people, injuries, water level, landmarks nearby, floor/building you're in…"
        className="w-full text-sm rounded-xl border-2 bg-background p-4 resize-none h-28 mb-4 focus:outline-none focus:border-red-500"
      />
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-head py-3 rounded-xl transition-all text-sm"
        >
          <PhoneCall className="w-4 h-4" />
          Send SOS — Alert Authorities
        </button>
        <button
          onClick={onReset}
          className="px-5 py-3 rounded-xl border-2 text-sm font-head hover:bg-muted transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  if (status === 'submitting') return (
    <div className="border-2 border-orange-500/30 rounded-2xl p-8 bg-orange-500/5 flex items-center gap-4">
      <Loader2 className="w-7 h-7 text-orange-500 animate-spin shrink-0" />
      <div>
        <p className="font-head text-base">Submitting rescue request…</p>
        <p className="text-sm text-muted-foreground">Notifying emergency services and NGOs</p>
      </div>
    </div>
  );

  if (status === 'error') return (
    <div className="border-2 border-red-500/30 rounded-2xl p-6 bg-red-500/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="font-head text-base text-red-500">Submission failed</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
      <button onClick={onReset} className="w-full font-head py-3 rounded-xl border-2 hover:bg-muted transition-all">
        Try again
      </button>
    </div>
  );

  const isDispatched = status === 'dispatched' || status === 'pending_no_contacts';
  return (
    <div className={`border-2 rounded-2xl p-6 ${isDispatched ? 'border-green-500/40 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
      <div className="flex items-center gap-2 mb-4">
        {isDispatched
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
        }
        <span className={`font-head text-base ${isDispatched ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
          {isDispatched ? 'Rescue request dispatched' : 'Request submitted — notifying…'}
        </span>
      </div>

      {incidentId && (
        <div className="bg-muted/50 rounded-xl p-4 mb-4 border-2">
          <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Incident ID</p>
          <p className="font-head text-lg tracking-widest">{incidentId.slice(0, 8).toUpperCase()}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Reference this ID when contacted by authorities</p>
        </div>
      )}

      <div className="space-y-2 text-sm text-muted-foreground mb-4">
        {isDispatched ? (
          <>
            <p>✅ Acknowledgement sent to your email</p>
            {notifiedAt
              ? <p>✅ Authorities notified at {notifiedAt}</p>
              : <p>✅ Emergency services have been notified</p>
            }
            <p>📍 Your GPS coordinates have been shared with responders</p>
          </>
        ) : (
          <>
            <p>✅ Request received and logged</p>
            <p className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Notifying emergency services…
            </p>
          </>
        )}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          💡 <strong>While you wait:</strong> Move to higher ground · Stay visible · Conserve battery · Signal rescuers with noise or light
        </p>
      </div>

      {isDispatched && (
        <button onClick={onReset} className="w-full text-sm font-head py-2.5 rounded-xl border-2 hover:bg-muted transition-all text-muted-foreground">
          Submit another request
        </button>
      )}
    </div>
  );
}
