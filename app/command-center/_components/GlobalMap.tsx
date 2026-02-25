'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import type { FloodResponsePlan, FloodZone, SafeZone, RescueTeam, Hospital } from './types';

interface Props {
  plan: FloodResponsePlan | null;
  userLocation?: { lat: number; lng: number; city: string } | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  moderate: '#EAB308',
  low: '#22C55E',
};

const MANAGED_LAYERS = ['floodnet-heatmap', 'floodnet-route', 'floodnet-route-outline'];
const MANAGED_SOURCES = ['floodnet-heatmap-src', 'floodnet-route-src'];

function pinSvg(color: string) {
  return `<svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4))">
    <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32S24 21 24 12C24 5.37 18.63 0 12 0ZM12 17C9.24 17 7 14.76 7 12S9.24 7 12 7S17 9.24 17 12S14.76 17 12 17Z" fill="${color}" stroke="white" stroke-width="1.5"/>
  </svg>`;
}

function hospitalSvg() {
  return `<svg width="34" height="44" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4))">
    <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32S24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#ffffff" stroke="#DC2626" stroke-width="2"/>
    <rect x="10" y="6" width="4" height="12" rx="1" fill="#DC2626"/>
    <rect x="6" y="10" width="12" height="4" rx="1" fill="#DC2626"/>
  </svg>`;
}

function popupHtml(title: string, details: string[]) {
  return `<div style="font-family:Space Grotesk,system-ui,sans-serif;padding:8px;min-width:160px;">
    <h3 style="font-weight:900;font-size:13px;margin:0 0 6px;border-bottom:1px solid #eee;padding-bottom:4px;">${title}</h3>
    ${details.map(d => `<p style="font-size:11px;color:#555;margin:2px 0;">${d}</p>`).join('')}
  </div>`;
}

export default function GlobalMap({ plan, userLocation }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const prevPlanRef = useRef<FloodResponsePlan | null>(null);

  const cleanupLayers = useCallback((map: mapboxgl.Map) => {
    MANAGED_LAYERS.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    MANAGED_SOURCES.forEach(id => { if (map.getSource(id)) map.removeSource(id); });
  }, []);

  const renderPlan = useCallback((map: mapboxgl.Map, animate: boolean) => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    cleanupLayers(map);

    if (!plan) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    const addMarker = (el: HTMLElement, lngLat: [number, number], popup: mapboxgl.Popup) => {
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lngLat)
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend(lngLat);
      hasPoints = true;
    };

    const mkPopup = (html: string) =>
      new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: '240px' }).setHTML(html);

    // ── heatmap layer ──
    if (plan.heatmap_points?.length) {
      const features = plan.heatmap_points.map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        properties: { intensity: p.intensity },
      }));

      map.addSource('floodnet-heatmap-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      map.addLayer({
        id: 'floodnet-heatmap',
        type: 'heatmap',
        source: 'floodnet-heatmap-src',
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': 1.2,
          'heatmap-radius': 35,
          'heatmap-opacity': 0.55,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(0,0,255,0)',
            0.15, 'rgb(0,200,255)',
            0.35, 'rgb(0,255,120)',
            0.55, 'rgb(255,255,0)',
            0.75, 'rgb(255,140,0)',
            0.9,  'rgb(255,45,0)',
            1,    'rgb(180,0,0)',
          ],
        },
      });
    }

    // ── evacuation route line ──
    if (plan.route_polyline?.length) {
      map.addSource('floodnet-route-src', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: plan.route_polyline },
          properties: {},
        },
      });

      map.addLayer({
        id: 'floodnet-route-outline',
        type: 'line',
        source: 'floodnet-route-src',
        paint: { 'line-color': '#1e3a5f', 'line-width': 7, 'line-opacity': 0.4 },
      });

      map.addLayer({
        id: 'floodnet-route',
        type: 'line',
        source: 'floodnet-route-src',
        paint: { 'line-color': '#3B82F6', 'line-width': 4, 'line-dasharray': [2, 1.5] },
      });

      plan.route_polyline.forEach(c => { bounds.extend(c as [number, number]); hasPoints = true; });
    }

    // ── flood zone markers ──
    plan.flood_zones?.forEach(zone => {
      if (!zone.geo_coordinates?.latitude) return;
      const el = document.createElement('div');
      el.innerHTML = pinSvg(SEVERITY_COLOR[zone.severity] || '#3B82F6');
      addMarker(
        el.firstElementChild as HTMLElement,
        [zone.geo_coordinates.longitude, zone.geo_coordinates.latitude],
        mkPopup(popupHtml(`⚠️ ${zone.zone_name}`, [
          `Severity: ${zone.severity.toUpperCase()}`,
          `Water Level: ${zone.water_level_m}m`,
          `Affected: ${zone.affected_population?.toLocaleString()} people`,
          zone.description,
        ])),
      );
    });

    // ── safe zone / shelter markers ──
    plan.safe_zones?.forEach(zone => {
      if (!zone.geo_coordinates?.latitude) return;
      const el = document.createElement('div');
      el.innerHTML = pinSvg('#22C55E');
      addMarker(
        el.firstElementChild as HTMLElement,
        [zone.geo_coordinates.longitude, zone.geo_coordinates.latitude],
        mkPopup(popupHtml(`🏠 ${zone.name}`, [
          `Capacity: ${zone.current_occupancy}/${zone.capacity}`,
          `Specialty: ${zone.specialty}`,
          `ETA: ${zone.eta_minutes} min`,
        ])),
      );
    });

    // ── hospital markers ──
    plan.hospitals?.forEach(h => {
      if (!h.geo_coordinates?.latitude) return;
      const el = document.createElement('div');
      el.innerHTML = hospitalSvg();
      addMarker(
        el.firstElementChild as HTMLElement,
        [h.geo_coordinates.longitude, h.geo_coordinates.latitude],
        mkPopup(popupHtml(`🏥 ${h.name}`, [
          h.address,
          `Distance: ${h.distance_km} km`,
          `Status: ${h.open_now ? '🟢 Open' : '🔴 Closed'}`,
          h.at_risk ? '⚠️ Within flood risk zone' : '✅ Outside risk zone',
        ])),
      );
    });

    // ── rescue team markers ──
    plan.rescue_teams?.forEach(team => {
      if (!team.geo_coordinates?.latitude) return;
      const color = team.status === 'deployed' ? '#3B82F6' : team.status === 'en_route' ? '#8B5CF6' : '#6B7280';
      const el = document.createElement('div');
      el.innerHTML = pinSvg(color);
      addMarker(
        el.firstElementChild as HTMLElement,
        [team.geo_coordinates.longitude, team.geo_coordinates.latitude],
        mkPopup(popupHtml(`🚤 ${team.team_name}`, [
          `Status: ${team.status}`,
          `Equipment: ${team.equipment?.join(', ')}`,
          `ETA: ${team.eta_minutes} min`,
        ])),
      );
    });

    // ── Poriya-style animated zoom into the area ──
    if (animate && hasPoints) {
      const center = bounds.getCenter();
      // First rotate/zoom the globe towards the area (like Poriya does)
      map.easeTo({ center: [center.lng, center.lat], zoom: 3, duration: 1200, pitch: 20 });
      setTimeout(() => {
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 2200, pitch: 30 });
        setTimeout(() => {
          map.easeTo({ pitch: 0, duration: 800 });
        }, 2400);
      }, 1400);
    } else if (hasPoints) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 2500 });
    } else if (plan.center_coordinates?.latitude) {
      const dest: [number, number] = [plan.center_coordinates.longitude, plan.center_coordinates.latitude];
      if (animate) {
        map.easeTo({ center: dest, zoom: 3, duration: 1200, pitch: 20 });
        setTimeout(() => {
          map.flyTo({ center: dest, zoom: 10, duration: 2200 });
          setTimeout(() => map.easeTo({ pitch: 0, duration: 800 }), 2400);
        }, 1400);
      } else {
        map.flyTo({ center: dest, zoom: 10, duration: 2500 });
      }
    }
  }, [plan, cleanupLayers]);

  // ─── init map ───
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    // Skip Mapbox telemetry/events requests to avoid ERR_CONNECTION_REFUSED in console when blocked
    const transformRequest = (url: string) => {
      if (url.includes('events.mapbox.com')) return { url: '' };
      return { url };
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937],
      zoom: 1.5,
      projection: { name: 'globe' },
      transformRequest,
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
      renderPlan(map, true);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render when plan changes — animate only when plan is NEW (first time or updated)
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      const isNewPlan = plan !== prevPlanRef.current && plan !== null;
      prevPlanRef.current = plan;
      renderPlan(map, isNewPlan);
    }
  }, [plan, renderPlan]);

  // Fly to user location when detected (and no plan is active)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Remove previous user marker
    userMarkerRef.current?.remove();

    // Add a pulsing blue dot for the user's location
    const el = document.createElement('div');
    el.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);animation:pulse-ring 2s ease-out infinite"></div>`;
    const marker = new mapboxgl.Marker({ element: el.firstElementChild as HTMLElement })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 12, closeButton: false, maxWidth: '200px' })
          .setHTML(`<div style="font-family:Space Grotesk,system-ui;padding:6px;"><strong style="font-size:12px;">📍 ${userLocation.city}</strong><p style="font-size:10px;color:#666;margin:4px 0 0;">Your location</p></div>`)
      )
      .addTo(map);
    userMarkerRef.current = marker;

    // Only fly to user location if no plan is active
    if (!plan) {
      map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 10, duration: 2500 });
    }
  }, [userLocation, plan]);

  const weatherBadge = plan?.weather_current ? (
    <div className="absolute top-4 right-14 bg-white/90 backdrop-blur border-2 border-black px-3 py-2 rounded-lg z-10 pointer-events-none shadow-md">
      <p className="text-[10px] font-head uppercase tracking-wider text-muted-foreground mb-1">Live Weather</p>
      <p className="text-xs font-bold text-foreground">{plan.weather_current.temp_c}°C · {plan.weather_current.description}</p>
      <p className="text-[10px] text-muted-foreground">
        Rain: {plan.weather_current.rainfall_mm}mm · Humidity: {plan.weather_current.humidity_pct}% · Wind: {plan.weather_current.wind_speed_kmh}km/h
      </p>
    </div>
  ) : null;

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

      {weatherBadge}

      {plan && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border-2 border-black p-2.5 rounded-lg shadow-md z-10 pointer-events-none">
          <p className="text-[10px] font-head uppercase tracking-wider text-muted-foreground mb-0.5">
            Tracking: {plan.location}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {plan.flood_zones?.length || 0} zones · {plan.safe_zones?.length || 0} shelters · {plan.hospitals?.length || 0} hospitals · {plan.rescue_teams?.length || 0} teams
          </p>
          {plan.risk_level && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-head uppercase ${
              plan.risk_level === 'critical' ? 'bg-red-500/80 text-white' :
              plan.risk_level === 'high' ? 'bg-orange-500/80 text-white' :
              plan.risk_level === 'moderate' ? 'bg-yellow-500/80 text-black' :
              'bg-green-500/80 text-white'
            }`}>
              {plan.risk_level} risk
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border-2 border-black p-2.5 rounded-lg shadow-md z-10 pointer-events-none">
        <div className="space-y-1">
          {[
            { color: '#EF4444', label: 'Flood Zone' },
            { color: '#22C55E', label: 'Safe Shelter' },
            { color: '#FFFFFF', label: 'Hospital', border: '#DC2626' },
            { color: '#3B82F6', label: 'Rescue Team' },
            { color: '#8B5CF6', label: 'Evacuation Route' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: item.color,
                  border: item.border ? `2px solid ${item.border}` : '1px solid #ddd',
                  boxSizing: 'border-box',
                }}
              />
              <span className="text-[9px] font-bold text-muted-foreground">{item.label}</span>
            </div>
          ))}
          {plan?.heatmap_points?.length ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{
                background: 'linear-gradient(135deg, #00c8ff, #ff0, #f00)',
              }} />
              <span className="text-[9px] font-bold text-muted-foreground">Flood Heatmap</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
