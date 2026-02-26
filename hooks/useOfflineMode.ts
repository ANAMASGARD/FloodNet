'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FloodResponsePlan } from '@/app/command-center/_components/types';

const PLAN_KEY = 'floodnet_cached_plan';
const REPORTS_KEY = 'floodnet_cached_reports';
const LOCATION_KEY = 'floodnet_cached_location';
const CACHE_TS_KEY = 'floodnet_cache_ts';

export interface OfflineState {
  isOffline: boolean;
  cachedPlan: FloodResponsePlan | null;
  cachedReports: any[];
  cachedLocation: { lat: number; lng: number; city: string } | null;
  cacheAge: string | null;
  cachePlan: (plan: FloodResponsePlan) => void;
  cacheReports: (reports: any[]) => void;
  cacheLocation: (loc: { lat: number; lng: number; city: string }) => void;
  loadCachedPlan: () => FloodResponsePlan | null;
  clearCache: () => void;
}

function getAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function useOfflineMode(): OfflineState {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedPlan, setCachedPlan] = useState<FloodResponsePlan | null>(null);
  const [cachedReports, setCachedReports] = useState<any[]>([]);
  const [cachedLocation, setCachedLocation] = useState<{ lat: number; lng: number; city: string } | null>(null);
  const [cacheAge, setCacheAge] = useState<string | null>(null);

  // Check online status
  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Load cache on mount & when going offline
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (raw) setCachedPlan(JSON.parse(raw));

      const rRaw = localStorage.getItem(REPORTS_KEY);
      if (rRaw) setCachedReports(JSON.parse(rRaw));

      const lRaw = localStorage.getItem(LOCATION_KEY);
      if (lRaw) setCachedLocation(JSON.parse(lRaw));

      const ts = localStorage.getItem(CACHE_TS_KEY);
      if (ts) setCacheAge(getAge(Number(ts)));
    } catch { /* corrupt cache, ignore */ }
  }, [isOffline]);

  // Update cache age every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const ts = localStorage.getItem(CACHE_TS_KEY);
        if (ts) setCacheAge(getAge(Number(ts)));
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const cachePlan = useCallback((plan: FloodResponsePlan) => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      setCachedPlan(plan);
      setCacheAge('just now');
    } catch { /* storage full */ }
  }, []);

  const cacheReports = useCallback((reports: any[]) => {
    try {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
      setCachedReports(reports);
    } catch {}
  }, []);

  const cacheLocation = useCallback((loc: { lat: number; lng: number; city: string }) => {
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
      setCachedLocation(loc);
    } catch {}
  }, []);

  const loadCachedPlan = useCallback(() => {
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(REPORTS_KEY);
    localStorage.removeItem(LOCATION_KEY);
    localStorage.removeItem(CACHE_TS_KEY);
    setCachedPlan(null);
    setCachedReports([]);
    setCachedLocation(null);
    setCacheAge(null);
  }, []);

  return {
    isOffline,
    cachedPlan,
    cachedReports,
    cachedLocation,
    cacheAge,
    cachePlan,
    cacheReports,
    cacheLocation,
    loadCachedPlan,
    clearCache,
  };
}
