'use client';
import React from 'react';
import { Shield, Loader } from 'lucide-react';

interface Props {
  generatePlan: () => void;
  isLoading: boolean;
  planGenerated: boolean;
}

export default function FinalUi({ generatePlan, isLoading, planGenerated }: Props) {
  if (planGenerated) {
    return (
      <div className="mt-3 p-3 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-center">
        <p className="text-xs font-head text-green-700 dark:text-green-400">
          Response Plan Ready!
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">Scroll down to view the full response plan and map</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="p-3 rounded-xl border-2 border-red-500/30 bg-red-500/5 text-center">
        <p className="text-xs text-muted-foreground mb-1">All information collected</p>
        <p className="text-[10px] text-muted-foreground">
          Generate a comprehensive flood response plan with safe zones, rescue teams, and evacuation routes.
        </p>
      </div>
      <button
        onClick={generatePlan}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-black font-head text-sm bg-red-500 text-white shadow-md hover:shadow-sm hover:translate-y-0.5 active:shadow-none active:translate-y-1 transition-all disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Coordinating Response...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Generate Response Plan
          </>
        )}
      </button>
    </div>
  );
}
