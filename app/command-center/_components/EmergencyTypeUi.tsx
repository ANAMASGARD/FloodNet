'use client';
import React from 'react';
import { Shield, Ship, Waves, MapPin, Stethoscope, Package } from 'lucide-react';

interface Props {
  onSelectedOption: (value: string) => void;
}

const types = [
  { icon: Waves, label: 'Flood Prediction', value: 'prediction', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { icon: Ship, label: 'Rescue Operation', value: 'rescue', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
  { icon: MapPin, label: 'Evacuation Planning', value: 'evacuation', color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  { icon: Stethoscope, label: 'Medical Emergency', value: 'medical', color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  { icon: Package, label: 'Relief & Supplies', value: 'relief', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { icon: Shield, label: 'Full Coordination', value: 'coordination', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' },
];

export default function EmergencyTypeUi({ onSelectedOption }: Props) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {types.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            onClick={() => onSelectedOption(`Emergency type: ${t.value}`)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-xs font-head transition-all hover:translate-y-[-1px] hover:shadow-md active:translate-y-0 ${t.color}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-foreground">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
