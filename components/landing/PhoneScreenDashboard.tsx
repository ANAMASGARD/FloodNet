"use client";

import { Activity, Droplets, Shield, Wifi } from "lucide-react";

/* ─── Miniaturized dashboard "screenshot" rendered inside a phone mockup ─── */
export function PhoneScreenDashboard() {
  /* Fake water-level sparkline path */
  const sparkline =
    "M0,28 L8,26 L16,30 L24,22 L28,32 L30,10 L32,38 L34,18 L40,24 L48,26 L56,20 L64,24 L72,28 L80,22 L88,26 L96,24 L104,28 L108,20 L110,10 L112,36 L114,16 L120,26";

  return (
    <div className="h-full w-full flex flex-col px-4 py-2 text-white text-[10px] leading-tight font-sans">
      {/* App header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
          <span className="font-head text-[11px] tracking-wide">FloodNet</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi size={10} className="text-green-400" />
          <Shield size={10} className="text-green-400" />
        </div>
      </div>

      {/* Greeting */}
      <p className="text-white/50 text-[9px] mb-1">Good morning,</p>
      <p className="font-head text-[13px] mb-3">Coord. Sarah Chen</p>

      {/* Flood metrics card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Droplets size={10} className="text-blue-400" />
            <span className="text-white/70">Water Level</span>
          </div>
          <span className="text-green-400 text-[9px] font-medium">Safe</span>
        </div>
        {/* Sparkline */}
        <svg viewBox="0 0 120 40" className="w-full h-8 mb-1.5">
          <path
            d={sparkline}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`${sparkline} L120,40 L0,40 Z`}
            fill="url(#blueGrad)"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex justify-between text-white/40 text-[8px]">
          <span>3.2 m</span>
          <span>78% Sat.</span>
          <span>450 m³/s</span>
        </div>
      </div>

      {/* Flood risk */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70">Flood Risk</span>
          <span className="text-[13px] font-head text-green-400">94%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-green-400 rounded-full" style={{ width: "94%" }} />
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-1.5 mb-2.5">
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[8px] border border-green-500/30">
          ● Normal
        </span>
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[8px] border border-blue-500/30">
          ● Connected
        </span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-1.5 mt-auto">
        {[
          { icon: Activity, label: "Sensors", color: "text-blue-400" },
          { icon: Droplets, label: "Zones", color: "text-orange-400" },
          { icon: Shield, label: "Reports", color: "text-green-400" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col items-center gap-1">
            <Icon size={12} className={color} />
            <span className="text-[7px] text-white/50">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
