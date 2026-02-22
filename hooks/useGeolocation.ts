'use client';

import { useState, useEffect, useRef } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  placeName?: string;
}

interface UseGeolocationReturn {
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => void;
}

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 min cache
};

export function useGeolocation(): UseGeolocationReturn {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    if (requested.current && userLocation) return;
    requested.current = true;
    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        requested.current = false;
        setIsLoading(false);
        if (err.code === 1) setError('Location permission denied');
        else if (err.code === 2) setError('Location unavailable');
        else setError('Could not get location');
      },
      OPTIONS,
    );
  };

  // Request once on mount when user opens command center
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    if (requested.current) return;
    requested.current = true;
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        requested.current = false;
        setIsLoading(false);
        if (err.code === 1) setError('Location permission denied');
        else if (err.code === 2) setError('Location unavailable');
        else setError('Could not get location');
      },
      OPTIONS,
    );
  }, []);

  return { userLocation, isLoading, error, requestLocation };
}
