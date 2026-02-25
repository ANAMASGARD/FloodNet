'use client';

import React, { useState, useCallback } from 'react';
import VoiceChat from './_components/VoiceChat';
import GlobalMap from './_components/GlobalMap';
import FloodResponsePanel from './_components/FloodResponsePanel';
import LocationManager from './_components/LocationManager';
import GeolocationPrompt from './_components/GeolocationPrompt';
import { Globe2, List, ArrowLeft, Waves, MapPin } from 'lucide-react';
import Link from 'next/link';
import type { FloodResponsePlan } from './_components/types';
import { Toaster } from 'sonner';
import { UserButton } from '@clerk/nextjs';

export default function CommandCenter() {
  const [plan, setPlan] = useState<FloodResponsePlan | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'plan' | 'locations'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; city: string } | null>(null);

  const handleLocationReady = useCallback((lat: number, lng: number, city: string) => {
    setUserLocation({ lat, lng, city });
  }, []);

  return (
    <>
      <Toaster richColors position="top-right" />
      <GeolocationPrompt onLocationReady={handleLocationReady} />

      {/* Header — compact */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b-2 border-border">
        <div className="max-w-[1920px] mx-auto px-4 h-12 flex items-center justify-between">
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

          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${plan ? 'bg-green-500' : 'bg-yellow-500'} pulse-dot`} />
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              {plan ? `Active: ${plan.location}` : 'Awaiting report...'}
            </span>
            <div className="w-px h-4 bg-border hidden md:block" />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-7 h-7',
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Grid — chat fills full height */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 px-3 py-2 max-w-[1920px] mx-auto h-[calc(100vh-48px)] overflow-hidden">
        {/* Left: VoiceChat — takes full remaining height */}
        <div className="lg:col-span-2 h-full min-h-0">
          <VoiceChat onPlanGenerated={setPlan} userLocation={userLocation} />
        </div>

        {/* Right: Map + Response Panel */}
        <div className="lg:col-span-3 relative h-full min-h-0 hidden lg:block">
          <div className="h-full overflow-hidden relative">
            <div className={`${activeView === 'map' ? 'block' : 'hidden'} h-full`}>
              <GlobalMap plan={plan} userLocation={userLocation} />
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
