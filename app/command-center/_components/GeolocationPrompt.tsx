'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X, Check, AlertCircle } from 'lucide-react';

interface Props {
  /** Called with lat/lng after location is saved so the map can center */
  onLocationReady?: (lat: number, lng: number, city: string) => void;
}

type Step = 'idle' | 'asking' | 'detecting' | 'saving' | 'done' | 'denied' | 'error';

/**
 * Try browser geolocation with a fallback strategy:
 * 1. High accuracy (GPS) with 8s timeout
 * 2. Low accuracy (network/wifi) with 15s timeout
 * 3. IP-based geolocation via free API as last resort
 */
async function detectLocation(): Promise<{ lat: number; lng: number }> {
  // Helper: wrap getCurrentPosition in a promise
  const fromBrowser = (highAccuracy: boolean, timeout: number) =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator?.geolocation) return reject(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: highAccuracy, timeout, maximumAge: 300_000 },
      );
    });

  // Strategy 1: high accuracy
  try {
    return await fromBrowser(true, 8_000);
  } catch {
    /* fall through */
  }

  // Strategy 2: low accuracy (network-based, works on desktops)
  try {
    return await fromBrowser(false, 15_000);
  } catch {
    /* fall through */
  }

  // Strategy 3: IP-based geolocation (no permission needed)
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8_000) });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude };
      }
    }
  } catch {
    /* fall through */
  }

  throw new Error('Could not detect location with any method.');
}

export default function GeolocationPrompt({ onLocationReady }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  // Check on mount whether we already have a saved location
  useEffect(() => {
    (async () => {
      try {
        // Sync user first so location GET doesn't 404
        await fetch('/api/user/sync', { method: 'POST' });
        const res = await fetch('/api/user/locations');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.locations?.length > 0) {
          // Already have locations, skip prompt
          const loc = data.locations[0];
          onLocationReady?.(
            typeof loc.lat === 'string' ? parseFloat(loc.lat) : loc.lat,
            typeof loc.lng === 'string' ? parseFloat(loc.lng) : loc.lng,
            loc.city ?? 'Your location',
          );
          return;
        }
      } catch {
        // DB not ready or not synced — still show prompt
      }

      // No saved locations → show prompt after a brief delay
      setTimeout(() => {
        setStep('asking');
        setVisible(true);
      }, 1500);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Save coordinates to DB and call onLocationReady */
  const saveAndNotify = useCallback(async (lat: number, lng: number) => {
    setStep('saving');
    setMessage('Getting your city info...');

    try {
      // 1. Reverse geocode
      const geoRes = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const geo = geoRes.ok
        ? await geoRes.json()
        : { city: null, region: null, country: null, displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };

      setMessage(`Found: ${geo.displayName}. Saving...`);

      // 2. Sync user (ensures DB user exists)
      await fetch('/api/user/sync', { method: 'POST' });

      // 3. Save location
      const saveRes = await fetch('/api/user/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'My Location',
          city: geo.city,
          region: geo.region,
          country: geo.country,
          lat,
          lng,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error ?? 'Failed to save');
      }

      setStep('done');
      setMessage(`📍 ${geo.displayName}`);
      onLocationReady?.(lat, lng, geo.city ?? geo.displayName);

      // Auto-dismiss after 3s
      setTimeout(() => setVisible(false), 3000);
    } catch (err) {
      setStep('error');
      setMessage(err instanceof Error ? err.message : 'Could not save location');
    }
  }, [onLocationReady]);

  const handleAllow = useCallback(async () => {
    setStep('detecting');
    setMessage('Detecting your location...');

    try {
      const { lat, lng } = await detectLocation();
      await saveAndNotify(lat, lng);
    } catch {
      setStep('error');
      setMessage('Could not detect location. You can add locations manually in the Locations tab.');
    }
  }, [saveAndNotify]);

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-background border-2 border-border rounded-2xl shadow-2xl max-w-md w-[90vw] p-6 animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            step === 'done' ? 'bg-green-100' :
            step === 'denied' || step === 'error' ? 'bg-red-100' :
            'bg-sky-100'
          }`}>
            {step === 'detecting' || step === 'saving' ? (
              <Loader2 className="w-7 h-7 text-sky-600 animate-spin" />
            ) : step === 'done' ? (
              <Check className="w-7 h-7 text-green-600" />
            ) : step === 'denied' || step === 'error' ? (
              <AlertCircle className="w-7 h-7 text-red-500" />
            ) : (
              <MapPin className="w-7 h-7 text-sky-600" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          {step === 'asking' && (
            <>
              <h3 className="font-head text-lg mb-2">Enable Location Access</h3>
              <p className="text-sm text-muted-foreground mb-1">
                FloodNet needs your location to:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mb-5 text-left mx-auto max-w-[280px]">
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 mt-0.5">•</span>
                  Show your area on the flood risk map
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 mt-0.5">•</span>
                  Monitor weather conditions near you
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500 mt-0.5">•</span>
                  Send flood alerts for your area via email
                </li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 text-sm font-head px-4 py-2.5 rounded-xl border-2 border-border hover:bg-muted transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={handleAllow}
                  className="flex-1 text-sm font-head px-4 py-2.5 rounded-xl bg-primary text-primary-foreground border-2 border-black shadow-md hover:shadow-sm hover:translate-y-0.5 active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Allow Location
                </button>
              </div>
            </>
          )}

          {(step === 'detecting' || step === 'saving') && (
            <>
              <h3 className="font-head text-lg mb-2">Detecting Location</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}

          {step === 'done' && (
            <>
              <h3 className="font-head text-lg mb-2 text-green-700">Location Saved!</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                You&apos;ll receive flood alerts for this area.
              </p>
            </>
          )}

          {(step === 'denied' || step === 'error') && (
            <>
              <h3 className="font-head text-lg mb-2 text-red-600">
                {step === 'denied' ? 'Permission Denied' : 'Error'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{message}</p>
              <button
                onClick={handleDismiss}
                className="text-sm font-head px-6 py-2.5 rounded-xl border-2 border-border hover:bg-muted transition-colors"
              >
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
