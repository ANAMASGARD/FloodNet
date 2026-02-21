'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import type { FloodResponsePlan, FloodZone, SafeZone, RescueTeam } from './types';

interface Props {
  plan: FloodResponsePlan | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  moderate: '#EAB308',
  low: '#22C55E',
};

function createFloodZoneMarkerHtml(zone: FloodZone) {
  const color = SEVERITY_COLOR[zone.severity] || '#3B82F6';
  return `
    <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));transition:transform 0.3s;">
      <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0ZM12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>
  `;
}

function createSafeZoneMarkerHtml() {
  return `
    <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));transition:transform 0.3s;">
      <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0ZM12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17Z" fill="#22C55E" stroke="white" stroke-width="1.5"/>
    </svg>
  `;
}

function createRescueTeamMarkerHtml(team: RescueTeam) {
  const color = team.status === 'deployed' ? '#3B82F6' : team.status === 'en_route' ? '#8B5CF6' : '#6B7280';
  return `
    <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));transition:transform 0.3s;">
      <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0ZM12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>
  `;
}

function createPopupHtml(title: string, details: string[]) {
  return `
    <div style="font-family:Space Grotesk,sans-serif;padding:8px;min-width:160px;">
      <h3 style="font-weight:900;font-size:13px;margin:0 0 6px;border-bottom:1px solid #eee;padding-bottom:4px;">${title}</h3>
      ${details.map(d => `<p style="font-size:11px;color:#666;margin:2px 0;">${d}</p>`).join('')}
    </div>
  `;
}

export default function GlobalMap({ plan }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const renderMarkers = useCallback((map: mapboxgl.Map) => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!plan) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasMarkers = false;

    // Flood zones
    plan.flood_zones?.forEach((zone) => {
      if (!zone.geo_coordinates?.latitude) return;
      const el = document.createElement('div');
      el.innerHTML = createFloodZoneMarkerHtml(zone);

      const marker = new mapboxgl.Marker({ element: el.firstElementChild as HTMLElement, anchor: 'bottom' })
        .setLngLat([zone.geo_coordinates.longitude, zone.geo_coordinates.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(
          createPopupHtml(`⚠️ ${zone.zone_name}`, [
            `Severity: ${zone.severity.toUpperCase()}`,
            `Water Level: ${zone.water_level_m}m`,
            `Affected: ${zone.affected_population?.toLocaleString()} people`,
            zone.description,
          ])
        ))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([zone.geo_coordinates.longitude, zone.geo_coordinates.latitude]);
      hasMarkers = true;
    });

    // Safe zones
    plan.safe_zones?.forEach((zone) => {
      if (!zone.geo_coordinates?.latitude) return;
      const el = document.createElement('div');
      el.innerHTML = createSafeZoneMarkerHtml();

      const marker = new mapboxgl.Marker({ element: el.firstElementChild as HTMLElement, anchor: 'bottom' })
        .setLngLat([zone.geo_coordinates.longitude, zone.geo_coordinates.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(
          createPopupHtml(`🏠 ${zone.name}`, [
            `Capacity: ${zone.current_occupancy}/${zone.capacity}`,
            `Specialty: ${zone.specialty}`,
            `ETA: ${zone.eta_minutes} min`,
          ])
        ))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([zone.geo_coordinates.longitude, zone.geo_coordinates.latitude]);
      hasMarkers = true;
    });

    // Rescue teams
    plan.rescue_teams?.forEach((team) => {
      if (!team.geo_coordinates?.latitude) return;
      const el = document.createElement('div');
      el.innerHTML = createRescueTeamMarkerHtml(team);

      const marker = new mapboxgl.Marker({ element: el.firstElementChild as HTMLElement, anchor: 'bottom' })
        .setLngLat([team.geo_coordinates.longitude, team.geo_coordinates.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(
          createPopupHtml(`🚤 ${team.team_name}`, [
            `Status: ${team.status}`,
            `Equipment: ${team.equipment?.join(', ')}`,
            `ETA: ${team.eta_minutes} min`,
          ])
        ))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([team.geo_coordinates.longitude, team.geo_coordinates.latitude]);
      hasMarkers = true;
    });

    if (hasMarkers) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 2500 });
    } else if (plan.center_coordinates?.latitude) {
      map.flyTo({
        center: [plan.center_coordinates.longitude, plan.center_coordinates.latitude],
        zoom: 8,
        duration: 2500,
      });
    }
  }, [plan]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937],
      zoom: 1.5,
      projection: { name: 'globe' },
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.setFog({
        color: 'rgb(186, 210, 247)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6,
      });
      renderMarkers(map);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      renderMarkers(map);
    }
  }, [plan, renderMarkers]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-2xl border-2 border-black shadow-md overflow-hidden bg-blue-50"
      />

      {!mapRef.current && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-blue-400 font-head animate-pulse uppercase tracking-widest text-xs">Initializing Globe...</p>
        </div>
      )}

      {plan && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border-2 border-black p-2 rounded shadow-md z-10 pointer-events-none">
          <p className="text-[10px] font-head uppercase italic text-black">
            📍 Tracking: {plan.location}
          </p>
          <p className="text-[9px] text-gray-500">
            {plan.flood_zones?.length || 0} zones · {plan.safe_zones?.length || 0} shelters · {plan.rescue_teams?.length || 0} teams
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border-2 border-black p-2 rounded shadow-md z-10 pointer-events-none">
        <div className="space-y-1">
          {[
            { color: '#EF4444', label: 'Flood Zone' },
            { color: '#22C55E', label: 'Safe Zone' },
            { color: '#3B82F6', label: 'Rescue Team' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-[9px] font-bold text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
