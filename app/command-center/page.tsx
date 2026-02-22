'use client';

import React, { useState } from 'react';
import VoiceChat from './_components/VoiceChat';
import GlobalMap from './_components/GlobalMap';
import FloodResponsePanel from './_components/FloodResponsePanel';
import { Globe2, List, ArrowLeft, Waves, Network } from 'lucide-react';
import Link from 'next/link';
import type { FloodResponsePlan } from './_components/types';
import { Toaster } from 'sonner';

export default function CommandCenter() {
  const [plan, setPlan] = useState<FloodResponsePlan | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'plan'>('map');

  return (
    <>
      <Toaster richColors position="top-right" />

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
            {plan?.zynd_network && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                <Network className="w-3 h-3 text-violet-500" />
                <span className="text-[9px] font-head text-violet-600 dark:text-violet-400">
                  Zynd: {plan.zynd_network.agents_discovered_via_zynd} agents
                </span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground hidden md:inline">
              {plan ? `Active: ${plan.location}` : 'Awaiting report...'}
            </span>
            <div className={`w-2 h-2 rounded-full ${plan ? 'bg-green-500' : 'bg-yellow-500'} pulse-dot`} />
          </div>
        </div>
      </header>

      {/* Main Grid — chat fills full height */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 px-3 py-2 max-w-[1920px] mx-auto h-[calc(100vh-48px)] overflow-hidden">
        {/* Left: VoiceChat — takes full remaining height */}
        <div className="lg:col-span-2 h-full min-h-0">
          <VoiceChat onPlanGenerated={setPlan} />
        </div>

        {/* Right: Map + Response Panel */}
        <div className="lg:col-span-3 relative h-full min-h-0 hidden lg:block">
          <div className="h-full overflow-hidden relative">
            <div className={`${activeView === 'map' ? 'block' : 'hidden'} h-full`}>
              <GlobalMap plan={plan} />
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
          </div>

          {/* Toggle Map / Plan */}
          <button
            onClick={() => setActiveView(activeView === 'map' ? 'plan' : 'map')}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full font-head text-sm bg-primary text-primary-foreground border-2 border-black shadow-md hover:shadow-sm hover:translate-y-0.5 active:shadow-none active:translate-y-1 transition-all"
          >
            {activeView === 'map' ? (
              <><List className="w-4 h-4" /> View Plan</>
            ) : (
              <><Globe2 className="w-4 h-4" /> View Map</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
