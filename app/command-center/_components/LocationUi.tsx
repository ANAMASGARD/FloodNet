'use client';
import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface Props {
  onSelectedOption: (value: string) => void;
}

const quickLocations = [
  'Mumbai', 'Chennai', 'Kolkata', 'Patna',
  'Guwahati', 'Kochi', 'Lucknow', 'Srinagar',
];

export default function LocationUi({ onSelectedOption }: Props) {
  const [custom, setCustom] = useState('');

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {quickLocations.map((loc) => (
          <button
            key={loc}
            onClick={() => onSelectedOption(loc)}
            className="px-3 py-1.5 rounded-lg border-2 text-xs font-head bg-background hover:bg-red-500/10 hover:border-red-500/40 transition-all active:scale-95"
          >
            <MapPin className="inline w-3 h-3 mr-1" />
            {loc}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) onSelectedOption(custom.trim()); }}
          placeholder="Or type a location..."
          className="flex-1 px-3 py-1.5 rounded-lg border-2 text-xs bg-background focus:outline-none focus:border-red-500/50"
        />
        <button
          onClick={() => { if (custom.trim()) onSelectedOption(custom.trim()); }}
          disabled={!custom.trim()}
          className="px-3 py-1.5 rounded-lg border-2 text-xs font-head bg-red-500 text-white disabled:opacity-40"
        >
          Go
        </button>
      </div>
    </div>
  );
}
