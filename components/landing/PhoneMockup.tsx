"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  rotation?: number;
  className?: string;
  delay?: number;
  scale?: number;
}

export function PhoneMockup({
  children,
  rotation = 0,
  className = "",
  delay = 0,
  scale = 1,
}: PhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: rotation }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={`relative ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      {/* Phone frame */}
      <div className="phone-glow relative bg-[#1a1a1a] rounded-[2.5rem] border-[6px] border-[#2a2a2a] shadow-2xl overflow-hidden"
           style={{ width: 280, height: 560 }}>
        {/* Notch / Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20" />
        
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-end justify-between px-8 pb-0.5">
          <span className="text-[9px] text-white/60 font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-[2px]">
              <div className="w-[3px] h-[4px] bg-white/60 rounded-[0.5px]" />
              <div className="w-[3px] h-[6px] bg-white/60 rounded-[0.5px]" />
              <div className="w-[3px] h-[8px] bg-white/60 rounded-[0.5px]" />
              <div className="w-[3px] h-[10px] bg-white/40 rounded-[0.5px]" />
            </div>
            <svg width="14" height="10" viewBox="0 0 14 10" className="text-white/60 ml-1">
              <rect x="0" y="0" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1"/>
              <rect x="1.5" y="2" width="7" height="6" rx="0.5" fill="currentColor"/>
              <rect x="11.5" y="3" width="2" height="4" rx="0.5" fill="currentColor"/>
            </svg>
          </div>
        </div>

        {/* Screen content */}
        <div className="w-full h-full bg-[#0F0A0A] rounded-[2rem] overflow-hidden pt-12 pb-6">
          {children}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full" />
      </div>
    </motion.div>
  );
}
