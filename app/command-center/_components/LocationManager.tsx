'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Trash2, Loader2, AlertTriangle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface SavedLocation {
  id: string;
  label: string;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number;
  lng: number;
  isActive: boolean;
}

interface RiskInfo {
  riskLevel: string;
  confidence: number;
  reasoning: string;
  leadTimeHours: number | null;
  suggestedAction: string;
  evaluatedAt: string;
}

interface LocationWithRisk {
  location: SavedLocation;
  risk: RiskInfo | null;
}

const riskColors: Record<string, string> = {
  none: 'bg-gray-100 text-gray-600 border-gray-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  extreme: 'bg-red-50 text-red-700 border-red-200',
};

const riskDotColors: Record<string, string> = {
  none: 'bg-gray-400',
  low: 'bg-blue-500',
  moderate: 'bg-amber-500',
  high: 'bg-orange-500',
  extreme: 'bg-red-500',
};

export default function LocationManager() {
  const [locations, setLocations] = useState<LocationWithRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: '',
    city: '',
    country: '',
    lat: '',
    lng: '',
  });

  const fetchLocations = useCallback(async () => {
    try {
      const [locRes, riskRes] = await Promise.all([
        fetch('/api/user/locations'),
        fetch('/api/user/risk-history'),
      ]);

      const locData = await locRes.json();
      const riskData = riskRes.ok ? await riskRes.json() : { assessments: [] };

      const locs: SavedLocation[] = locData.locations ?? [];
      const risks: LocationWithRisk[] = riskData.assessments ?? [];

      // Merge risk data with locations
      const merged = locs.map((loc) => {
        const match = risks.find((r: LocationWithRisk) => r.location.id === loc.id);
        return { location: loc, risk: match?.risk ?? null };
      });

      setLocations(merged);
    } catch {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sync user on mount
    fetch('/api/user/sync', { method: 'POST' }).finally(fetchLocations);
  }, [fetchLocations]);

  const handleAdd = async () => {
    if (!form.label || !form.lat || !form.lng) {
      toast.error('Label, latitude, and longitude are required');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/user/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          city: form.city || null,
          country: form.country || null,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
        }),
      });

      if (!res.ok) throw new Error('Failed to add');

      toast.success(`"${form.label}" added`);
      setForm({ label: '', city: '', country: '', lat: '', lng: '' });
      setShowForm(false);
      fetchLocations();
    } catch {
      toast.error('Failed to add location');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    try {
      await fetch(`/api/user/locations?id=${id}`, { method: 'DELETE' });
      toast.success(`"${label}" removed`);
      fetchLocations();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        toast.success('Location detected');
      },
      () => toast.error('Could not get location'),
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-head text-sm">Monitored Locations</h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {locations.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-head px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Label (e.g. Home)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="col-span-2 text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              placeholder="Latitude"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              className="text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              type="number"
              step="any"
            />
            <input
              placeholder="Longitude"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              className="text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              type="number"
              step="any"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={useCurrentLocation}
              className="text-[10px] font-head px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              Use My Location
            </button>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="text-[10px] font-head px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
            >
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Save Location
            </button>
          </div>
        </div>
      )}

      {/* Location list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MapPin className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground font-head">No locations saved</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Add locations to receive flood alerts
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {locations.map(({ location, risk }) => (
              <div key={location.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${risk ? riskDotColors[risk.riskLevel] ?? 'bg-gray-400' : 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-head truncate">{location.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[location.city, location.country].filter(Boolean).join(', ') || `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {risk && (
                      <span className={`text-[9px] font-head px-2 py-0.5 rounded-full border ${riskColors[risk.riskLevel] ?? riskColors.none}`}>
                        {risk.riskLevel.toUpperCase()}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === location.id ? null : location.id)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      {expandedId === location.id ? (
                        <ChevronUp className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(location.id, location.label)}
                      className="p-1 rounded hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded risk details */}
                {expandedId === location.id && risk && (
                  <div className={`mt-2 p-2.5 rounded-lg border text-[10px] ${riskColors[risk.riskLevel] ?? riskColors.none}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-head">
                        {risk.riskLevel.toUpperCase()} RISK — {Math.round(risk.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="leading-relaxed mb-1.5">{risk.reasoning}</p>
                    {risk.suggestedAction && (
                      <p className="font-semibold">{risk.suggestedAction}</p>
                    )}
                    {risk.leadTimeHours && (
                      <p className="mt-1 opacity-75">Lead time: ~{risk.leadTimeHours}h</p>
                    )}
                    <p className="mt-1.5 opacity-50">
                      Updated {new Date(risk.evaluatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
