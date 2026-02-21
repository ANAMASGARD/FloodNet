"use client";

import { AlertTriangle, MapPin, Phone, Clock, Navigation } from "lucide-react";

/* ─── Emergency dispatch screen rendered inside a phone mockup ─── */
export function PhoneScreenEmergency() {
  return (
    <div className="h-full w-full flex flex-col px-4 py-2 text-white text-[10px] leading-tight font-sans">
      {/* Emergency header */}
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
        <span className="font-head text-[11px] text-red-400 tracking-wide">EMERGENCY ACTIVE</span>
        <div className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
      </div>

      {/* Alert banner */}
      <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-2.5 mb-2.5 flex items-start gap-2">
        <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-head text-[10px]">Cardiac Emergency</p>
          <p className="text-red-300/70 text-[8px] mt-0.5">Detected at 14:23 · Priority Level 1</p>
        </div>
      </div>

      {/* Mini map area */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl mb-2.5 overflow-hidden relative" style={{ height: 120 }}>
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
          {[...Array(8)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 12.5}%`} x2="100%" y2={`${(i + 1) * 12.5}%`} stroke="#4a5568" strokeWidth="0.5" />
          ))}
          {[...Array(10)].map((_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="#4a5568" strokeWidth="0.5" />
          ))}
        </svg>
        {/* Streets */}
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
          <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#6B7280" strokeWidth="2" />
          <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#6B7280" strokeWidth="2" />
          <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#6B7280" strokeWidth="2" />
          <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#6B7280" strokeWidth="2" />
        </svg>
        {/* Patient pin */}
        <div className="absolute top-[40%] left-[45%] flex flex-col items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center pulse-dot">
            <MapPin size={8} className="text-white" />
          </div>
          <div className="w-0.5 h-2 bg-red-500 mt-[-1px]" />
        </div>
        {/* Ambulance pin */}
        <div className="absolute top-[25%] left-[70%] flex flex-col items-center">
          <div className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
            <Navigation size={7} className="text-white" />
          </div>
        </div>
        {/* Hospital pin */}
        <div className="absolute top-[65%] left-[25%] flex flex-col items-center">
          <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-[6px] font-bold">
            H
          </div>
        </div>
        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full">
          <polyline
            points="175,70 175,100 130,100 130,130"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="4 3"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* ETA row */}
      <div className="flex gap-2 mb-2.5">
        <div className="flex-1 bg-blue-500/15 border border-blue-500/30 rounded-lg p-2 text-center">
          <Clock size={10} className="text-blue-400 mx-auto mb-0.5" />
          <p className="text-[9px] text-blue-300 font-head">ETA 4 min</p>
          <p className="text-[7px] text-blue-400/60">Ambulance</p>
        </div>
        <div className="flex-1 bg-green-500/15 border border-green-500/30 rounded-lg p-2 text-center">
          <MapPin size={10} className="text-green-400 mx-auto mb-0.5" />
          <p className="text-[9px] text-green-300 font-head">1.2 km</p>
          <p className="text-[7px] text-green-400/60">City General</p>
        </div>
      </div>

      {/* Dispatch info */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/50 text-[8px]">Assigned Unit</span>
          <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">● En Route</span>
        </div>
        <p className="font-head text-[10px]">Medic Unit 7 · Dr. Patel</p>
      </div>

      {/* CTA */}
      <button className="w-full bg-red-600 rounded-xl py-2.5 flex items-center justify-center gap-1.5 mt-auto active:bg-red-700 transition">
        <Phone size={12} />
        <span className="font-head text-[11px]">Contact Dispatch</span>
      </button>
    </div>
  );
}
