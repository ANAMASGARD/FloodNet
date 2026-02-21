'use client';
import React from 'react';
import { Waves, MapPin, Shield, Ship } from 'lucide-react';

interface Props {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  { icon: Waves, text: 'Flood alert in Bihar — need rescue coordination', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
  { icon: MapPin, text: 'Find safe zones near Patna', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { icon: Shield, text: 'Predict flood risk for Mumbai coastal areas', color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  { icon: Ship, text: 'Deploy rescue teams to Assam flood zone', color: 'text-green-500 bg-green-500/10 border-green-500/30' },
];

export default function EmptyBoxState({ onSuggestionClick }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-4">
        <Waves className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="font-head text-lg mb-1">FloodNet Command Center</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Report a flood, coordinate rescue, or predict risk. Speak or type below.
      </p>
      <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
        {suggestions.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.text}
              onClick={() => onSuggestionClick(s.text)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all hover:translate-y-[-1px] hover:shadow-md active:translate-y-0 ${s.color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-foreground">{s.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
