'use client';

import React, { useState, useCallback, useEffect } from 'react';
import VoiceChat from './_components/VoiceChat';
import GlobalMap from './_components/GlobalMap';
import FloodResponsePanel from './_components/FloodResponsePanel';
import LocationManager from './_components/LocationManager';
import GeolocationPrompt from './_components/GeolocationPrompt';
import CommunityReportPanel, { type CommunityReport } from './_components/CommunityReportPanel';
import { Globe2, List, ArrowLeft, Waves, MapPin, Radio, Zap, WifiOff, CloudOff, Menu, X, BarChart3, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import type { FloodResponsePlan } from './_components/types';
import { Toaster, toast } from 'sonner';
import { UserButton } from '@clerk/nextjs';
import axios from 'axios';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { Switch } from '@/components/retroui/Switch';

export default function CommandCenter() {
  const [plan, setPlan] = useState<FloodResponsePlan | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'plan' | 'locations'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; city: string } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const offline = useOfflineMode();
  const [dark, setDark] = useState(false);

  // Auto-cache plan whenever it changes
  useEffect(() => {
    if (plan) offline.cachePlan(plan);
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-cache reports
  useEffect(() => {
    if (communityReports.length) offline.cacheReports(communityReports);
  }, [communityReports]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-cache location
  useEffect(() => {
    if (userLocation) offline.cacheLocation(userLocation);
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load cached data when offline and no live plan
  useEffect(() => {
    if (offline.isOffline && !plan) {
      const cached = offline.loadCachedPlan();
      if (cached) {
        setPlan(cached);
        setActiveView('plan');
        toast.info('Loaded cached response plan (offline mode)');
      }
      if (offline.cachedReports.length) setCommunityReports(offline.cachedReports);
      if (offline.cachedLocation && !userLocation) setUserLocation(offline.cachedLocation);
    }
  }, [offline.isOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleLocationReady = useCallback((lat: number, lng: number, city: string) => {
    setUserLocation({ lat, lng, city });
  }, []);

  // Fetch community reports when location is available (skip when offline)
  useEffect(() => {
    if (offline.isOffline) return;
    async function fetchReports() {
      try {
        const params = userLocation
          ? `?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=0.5`
          : '';
        const res = await axios.get(`/api/community-reports${params}`);
        setCommunityReports(res.data.reports || []);
      } catch { /* silent */ }
    }
    fetchReports();
    const interval = setInterval(fetchReports, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [userLocation, offline.isOffline]);

  const handleReportSubmitted = useCallback((report: CommunityReport) => {
    setCommunityReports(prev => [report, ...prev]);
  }, []);

  const simulateFlood = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    const loc = userLocation || { lat: 26.8467, lng: 80.9462, city: 'Lucknow, UP, India' };
    try {
      const res = await axios.post('/api/ai-agent', {
        messages: [
          { role: 'user', content: `There is severe flooding in ${loc.city || 'my area'}. Water is rising fast. We need rescue and evacuation help immediately.` },
          { role: 'assistant', content: `I understand there is severe flooding in ${loc.city || 'your area'}. Let me generate a flood response plan.` },
          { role: 'user', content: 'Generate the flood response plan now with all collected information.' },
        ],
        isFinal: true,
        user_location: { latitude: loc.lat, longitude: loc.lng, placeName: loc.city },
        household: { floor_level: 'ground', vulnerable_members: ['elderly', 'children'], has_vehicle: false },
      });
      const data: FloodResponsePlan = res.data?.flood_response ?? res.data;
      if (data) {
        setPlan(data);
        toast.success('Simulation generated! Check the Plan view.');
        setActiveView('plan');
      }
    } catch (err: any) {
      toast.error('Simulation failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setSimulating(false);
    }
  }, [simulating, userLocation, setActiveView]);

  return (
    <>
      <Toaster richColors position="top-right" />
      <GeolocationPrompt onLocationReady={handleLocationReady} />

      {/* Offline Banner */}
      {offline.isOffline && (
        <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500 text-black px-4 py-2 text-xs font-head">
          <WifiOff className="w-4 h-4" />
          <span>You are offline — showing cached data{offline.cacheAge ? ` (saved ${offline.cacheAge})` : ''}</span>
          <CloudOff className="w-4 h-4 ml-1 opacity-60" />
        </div>
      )}

      {/* Header — compact */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b-2 border-border">
        <div className="max-w-[1920px] mx-auto px-4 h-12 flex items-center justify-between">
          {/* Left: back + logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-head hidden sm:inline">Back</span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot" />
              <h1 className="font-head text-base tracking-wide">FloodNet</h1>
              <span className="text-xs text-muted-foreground hidden sm:inline">Command Center</span>
            </div>
          </div>

          {/* Right: status + user + hamburger */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <Sun className="w-3.5 h-3.5 text-muted-foreground" />
              <Switch checked={dark} onCheckedChange={setDark} />
              <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className={`w-2 h-2 rounded-full ${plan ? 'bg-green-500' : 'bg-yellow-500'} pulse-dot`} />
            <span className="text-[10px] text-muted-foreground hidden md:inline max-w-[160px] truncate">
              {plan ? plan.location : 'Awaiting report...'}
            </span>
            <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
            <button
              onClick={() => setNavOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-border hover:bg-muted transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in nav panel */}
      {navOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          {/* Panel */}
          <nav className="fixed top-0 right-0 h-full w-72 bg-background border-l-2 border-border z-[80] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 h-14 border-b-2 border-border">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot" />
                <span className="font-head text-sm tracking-wide">FloodNet</span>
              </div>
              <button
                onClick={() => setNavOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status */}
            <div className="px-5 py-3 border-b border-border">
              <p className="text-[10px] font-head uppercase tracking-wider text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${plan ? 'bg-green-500' : 'bg-yellow-500'} pulse-dot`} />
                <span className="text-xs truncate">{plan ? `Active: ${plan.location}` : 'Awaiting report...'}</span>
              </div>
              {offline.isOffline && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600">Offline{offline.cacheAge ? ` · saved ${offline.cacheAge}` : ''}</span>
                </div>
              )}
            </div>

            {/* Nav actions */}
            <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {/* Simulate Flood */}
              <button
                onClick={() => { setNavOpen(false); simulateFlood(); }}
                disabled={simulating || offline.isOffline}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/30 text-left transition-all disabled:opacity-40"
              >
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-head text-sm">Simulate Flood</p>
                  <p className="text-[10px] text-muted-foreground">Test with mock incident</p>
                </div>
              </button>

              {/* Community Report */}
              <div onClick={() => setNavOpen(false)}>
                <CommunityReportPanel
                  userLocation={userLocation}
                  onReportSubmitted={handleReportSubmitted}
                  asNavItem
                />
              </div>

              {/* Ops Center */}
              <Link
                href="/ops-center"
                onClick={() => setNavOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border-2 border-indigo-500/30 transition-all"
              >
                <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-head text-sm">Ops Center</p>
                  <p className="text-[10px] text-muted-foreground">Authority dashboard</p>
                </div>
              </Link>

              {/* SOS Emergency */}
              <Link
                href="/emergency"
                onClick={() => setNavOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 transition-all"
              >
                <Radio className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <p className="font-head text-sm">🆘 SOS Emergency</p>
                  <p className="text-[10px] text-muted-foreground">Send distress signal</p>
                </div>
              </Link>

              <div className="border-t border-border pt-2">
                {/* View toggles */}
                {(['map', 'plan', 'locations'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setActiveView(v); setNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all my-1 ${
                      activeView === v ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-muted border-2 border-transparent'
                    }`}
                  >
                    {v === 'map' ? <Globe2 className="w-4 h-4 shrink-0" /> : v === 'plan' ? <List className="w-4 h-4 shrink-0" /> : <MapPin className="w-4 h-4 shrink-0" />}
                    <span className="font-head text-sm capitalize">{v === 'plan' ? 'Response Plan' : v === 'locations' ? 'Saved Locations' : 'Live Map'}</span>
                    {activeView === v && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border">
              <p className="text-[9px] text-muted-foreground text-center">FloodNet v1 · TerraCode Convergence 2026</p>
            </div>
          </nav>
        </>
      )}

      {/* Main Grid — chat fills full height */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 px-3 py-2 max-w-[1920px] mx-auto h-[calc(100vh-48px)] overflow-hidden">
        {/* Left: VoiceChat — full height */}
        <div className="lg:col-span-2 h-full min-h-0">
          <VoiceChat onPlanGenerated={setPlan} userLocation={userLocation} />
        </div>

        {/* Right: Map + Response Panel */}
        <div className="lg:col-span-3 relative h-full min-h-0 hidden lg:block">
          <div className="h-full overflow-hidden relative">
            <div className={`${activeView === 'map' ? 'block' : 'hidden'} h-full`}>
              <GlobalMap plan={plan} userLocation={userLocation} communityReports={communityReports} />
            </div>
            <div className={`${activeView === 'plan' ? 'block' : 'hidden'} h-full overflow-y-auto p-4`}>
              {plan ? (
                <FloodResponsePanel plan={plan} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Waves className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-sm font-head">No active response plan</p>
                  <p className="text-muted-foreground text-xs mt-1">Report a flood to generate a plan</p>
                </div>
              )}
            </div>
            <div className={`${activeView === 'locations' ? 'block' : 'hidden'} h-full`}>
              <LocationManager />
            </div>
          </div>

          {/* View toggle buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full p-1 border-2 border-black shadow-md">
            <button
              onClick={() => setActiveView('map')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-head text-xs transition-all ${
                activeView === 'map'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" /> Map
            </button>
            <button
              onClick={() => setActiveView('plan')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-head text-xs transition-all ${
                activeView === 'plan'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Plan
            </button>
            <button
              onClick={() => setActiveView('locations')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-head text-xs transition-all ${
                activeView === 'locations'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> Locations
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
