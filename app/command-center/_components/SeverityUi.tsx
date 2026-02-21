'use client';
import React from 'react';

interface Props {
  onSelectedOption: (value: string) => void;
}

const levels = [
  { label: 'Critical', value: 'critical', color: 'bg-red-500 text-white border-red-700', desc: 'Life-threatening, mass evacuation' },
  { label: 'High', value: 'high', color: 'bg-orange-500 text-white border-orange-700', desc: 'Significant flooding, urgent response' },
  { label: 'Moderate', value: 'moderate', color: 'bg-yellow-400 text-black border-yellow-600', desc: 'Rising waters, preparation needed' },
  { label: 'Low', value: 'low', color: 'bg-green-500 text-white border-green-700', desc: 'Early warning, monitoring phase' },
];

export default function SeverityUi({ onSelectedOption }: Props) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {levels.map((level) => (
        <button
          key={level.value}
          onClick={() => onSelectedOption(`Severity: ${level.value}`)}
          className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-left transition-all hover:translate-y-[-1px] hover:shadow-md active:translate-y-0 ${level.color}`}
        >
          <span className="font-head text-sm">{level.label}</span>
          <span className="text-[10px] opacity-80 mt-0.5">{level.desc}</span>
        </button>
      ))}
    </div>
  );
}
