'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
// import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import type { FloodResponsePlan, FloodZone, SafeZone, RescueTeam, Hospital } from './types';
import type { CommunityReport } from './CommunityReportPanel';

interface Props {
  plan: FloodResponsePlan | null;
  userLocation?: { lat: number; lng: number; city: string } | null;
  communityReports?: CommunityReport[];
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  moderate: '#EAB308',
  low: '#22C55E',
};

const MANAGED_LAYERS = ['floodnet-heatmap', 'floodnet-route', 'floodnet-route-outline', 'owm-weather'];
const MANAGED_SOURCES = ['floodnet-heatmap-src', 'floodnet-route-src', 'owm-weather-src'];

/* ── OWM weather layer definitions ── */
type WeatherLayerId = 'precipitation_new' | 'clouds_new' | 'temp_new' | 'wind_new' | 'pressure_new';

interface WeatherLayerDef {
  id: WeatherLayerId;
  label: string;
  icon: string;
  gradient: string; // CSS gradient for legend
  scaleLabels: [string, string]; // [min, max] labels
}

const OWM_LAYERS: WeatherLayerDef[] = [
  {
    id: 'precipitation_new',
    label: 'Rain',
    icon: '🌧️',
    gradient: 'linear-gradient(90deg, rgba(225,200,100,0) 0%, rgba(110,110,205,0.3) 20%, rgba(80,80,225,0.7) 60%, rgba(20,20,255,0.9) 100%)',
    scaleLabels: ['0 mm', '140 mm'],
  },
  {
    id: 'clouds_new',
    label: 'Clouds',
    icon: '☁️',
    gradient: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(247,247,255,0.5) 50%, rgba(240,240,255,1) 100%)',
    scaleLabels: ['0%', '100%'],
  },
  {
    id: 'temp_new',
    label: 'Temp',
    icon: '🌡️',
    gradient: 'linear-gradient(90deg, rgba(130,22,146,1) 0%, rgba(32,140,236,1) 25%, rgba(35,221,221,1) 40%, rgba(194,255,40,1) 55%, rgba(255,240,40,1) 70%, rgba(252,128,20,1) 100%)',
    scaleLabels: ['-40°C', '30°C'],
  },
  {
    id: 'wind_new',
    label: 'Wind',
    icon: '💨',
    gradient: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(238,206,206,0.4) 15%, rgba(179,100,188,0.7) 40%, rgba(63,33,59,0.8) 60%, rgba(116,76,172,0.9) 80%, rgba(70,0,175,1) 100%)',
    scaleLabels: ['1 m/s', '200 m/s'],
  },
  {
    id: 'pressure_new',
    label: 'Pressure',
    icon: '📊',
    gradient: 'linear-gradient(90deg, rgba(0,115,255,1) 0%, rgba(75,208,214,1) 25%, rgba(176,247,32,1) 50%, rgba(240,184,0,1) 75%, rgba(198,0,0,1) 100%)',
    scaleLabels: ['940 hPa', '1080 hPa'],
  },
];

function pinSvg(color: string) {
  return `<svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(255,255,255,0.4))">
    <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32S24 21 24 12C24 5.37 18.63 0 12 0ZM12 17C9.24 17 7 14.76 7 12S9.24 7 12 7S17 9.24 17 12S14.76 17 12 17Z" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
}

function hospitalSvg() {
  return `<svg width="34" height="44" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(255,255,255,0.4))">
    <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32S24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#ffffff" stroke="#DC2626" stroke-width="2.5"/>
    <rect x="10" y="6" width="4" height="12" rx="1" fill="#DC2626"/>
    <rect x="6" y="10" width="12" height="4" rx="1" fill="#DC2626"/>
  </svg>`;
}

const REPORT_ICONS: Record<string, string> = {
  flooding: '🌊', road_blocked: '🚧', power_out: '⚡',
  needs_rescue: '🆘', water_rising: '📈', safe_passage: '✅',
};
const REPORT_SEVERITY_COLOR: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', moderate: '#EAB308', low: '#22C55E',
};

function communityMarkerEl(type: string, severity: string) {
  const icon = REPORT_ICONS[type] || '📍';
  const color = REPORT_SEVERITY_COLOR[severity] || '#3B82F6';
  const el = document.createElement('div');
  el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:14px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5),0 0 12px rgba(255,255,255,0.3);cursor:pointer;">${icon}</div>`;
  return el.firstElementChild as HTMLElement;
}

const OBSTACLE_ICONS: Record<string, string> = {
  road_closed: '🚧', bridge_out: '🌉', debris: '🪵',
  power_line: '⚡', landslide: '🏔️', submerged_road: '🌊',
};

function obstacleMarkerEl(type: string, severity: string) {
  const icon = OBSTACLE_ICONS[type] || '⚠️';
  const color = severity === 'critical' ? '#EF4444' : severity === 'high' ? '#F97316' : '#EAB308';
  const el = document.createElement('div');
  el.innerHTML = `<div style="width:0;height:0;position:relative;">
    <div style="position:absolute;top:-17px;left:-17px;width:34px;height:34px;background:${color};clip-path:polygon(50% 0%,100% 100%,0% 100%);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.6);cursor:pointer;">
      <span style="font-size:13px;margin-top:8px;">${icon}</span>
    </div>
  </div>`;
  return el.firstElementChild as HTMLElement;
}

function popupHtml(title: string, details: string[]) {
  return `<div style="font-family:Space Grotesk,system-ui,sans-serif;padding:10px;min-width:180px;background:rgba(15,23,42,0.95);border-radius:8px;border:1px solid rgba(255,255,255,0.15);">
    <h3 style="font-weight:900;font-size:13px;margin:0 0 6px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;color:#fff;">${title}</h3>
    ${details.map(d => `<p style="font-size:11px;color:rgba(255,255,255,0.75);margin:2px 0;">${d}</p>`).join('')}
  </div>`;
}

export default function GlobalMap({ plan, userLocation, communityReports }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const communityMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const prevPlanRef = useRef<FloodResponsePlan | null>(null);

  // ── layer visibility state ──
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<WeatherLayerId>('precipitation_new');
  const [showWeather, setShowWeather] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);

  const owmKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  const cleanupLayers = useCallback((map: mapboxgl.Map) => {
    MANAGED_LAYERS.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    MANAGED_SOURCES.forEach(id => { if (map.getSource(id)) map.removeSource(id); });
  }, []);

  /* ── add / update OWM raster weather layer ── */
  const setupWeatherLayer = useCallback((map: mapboxgl.Map) => {
    if (!owmKey) return;

    const tileUrl = `https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${owmKey}`;

    if (map.getSource('owm-weather-src')) {
      // Swap tile URL when layer changes
      (map.getSource('owm-weather-src') as mapboxgl.RasterTileSource).setTiles([tileUrl]);
      if (map.getLayer('owm-weather')) {
        map.setLayoutProperty('owm-weather', 'visibility', showWeather ? 'visible' : 'none');
      }
      return;
    }

    map.addSource('owm-weather-src', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 7,
      attribution: '© <a href="https://openweathermap.org/" target="_blank">OpenWeatherMap</a>',
    });

    // Insert below any existing label/symbol layers so markers stay on top
    const firstSymbolLayer = map.getStyle().layers?.find(l => l.type === 'symbol');
    map.addLayer(
      {
        id: 'owm-weather',
        type: 'raster',
        source: 'owm-weather-src',
        paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 300 },
      },
      firstSymbolLayer?.id,
    );
  }, [owmKey, activeWeatherLayer, showWeather]);

  const renderPlan = useCallback((map: mapboxgl.Map, animate: boolean) => {
    // Clear markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Cleanup data layers (heatmap + route) but NOT owm-weather
    ['floodnet-heatmap', 'floodnet-route', 'floodnet-route-outline'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ['floodnet-heatmap-src', 'floodnet-route-src'].forEach(id => {
      if (map.getSource(id)) map.removeSource(id);
    });

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
      new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: '260px', className: 'floodnet-popup' }).setHTML(html);

    // ── AI risk heatmap layer ──
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
        layout: { visibility: showHeatmap ? 'visible' : 'none' },
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': 1.2,
          'heatmap-radius': 35,
          'heatmap-opacity': 0.6,
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
        layout: { visibility: showRoute ? 'visible' : 'none' },
        paint: { 'line-color': '#0ea5e9', 'line-width': 8, 'line-opacity': 0.35 },
      });

      map.addLayer({
        id: 'floodnet-route',
        type: 'line',
        source: 'floodnet-route-src',
        layout: { visibility: showRoute ? 'visible' : 'none' },
        paint: { 'line-color': '#38bdf8', 'line-width': 4, 'line-dasharray': [2, 1.5] },
      });

      plan.route_polyline.forEach(c => { bounds.extend(c as [number, number]); hasPoints = true; });
    }

    // ── markers (only if showMarkers) ──
    if (showMarkers) {
      // flood zone markers
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

      // safe zone / shelter markers
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

      // hospital markers
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

      // rescue team markers
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
    }

    // ── obstacle / road hazard markers ──
    if (showObstacles && plan.obstacles?.length) {
      plan.obstacles.forEach(obs => {
        if (!obs.geo_coordinates?.latitude) return;
        const el = obstacleMarkerEl(obs.type, obs.severity);
        const icon = OBSTACLE_ICONS[obs.type] || '⚠️';
        addMarker(
          el,
          [obs.geo_coordinates.longitude, obs.geo_coordinates.latitude],
          mkPopup(popupHtml(`${icon} ${obs.type.replace(/_/g, ' ').toUpperCase()}`, [
            obs.description,
            `Severity: ${obs.severity.toUpperCase()}`,
            ...(obs.affects_route ? [`Affects: ${obs.affects_route}`] : []),
          ])),
        );
      });
    }

    // ── animated zoom ──
    if (animate && hasPoints) {
      const center = bounds.getCenter();
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
  }, [plan, showHeatmap, showMarkers, showRoute, showObstacles]);

  // ─── init map ───
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    const transformRequest = (url: string) => {
      if (url.includes('events.mapbox.com')) return { url: '' };
      return { url };
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [78.9629, 20.5937],
      zoom: 1.5,
      projection: { name: 'globe' },
      transformRequest,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      map.setFog({
        color: 'rgb(10, 10, 30)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.03,
        'space-color': 'rgb(5, 5, 15)',
        'star-intensity': 0.8,
      });

      // OWM weather tiles
      setupWeatherLayer(map);

      renderPlan(map, true);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      communityMarkersRef.current.forEach(m => m.remove());
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── update OWM layer when weather layer or visibility changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    setupWeatherLayer(map);
  }, [activeWeatherLayer, showWeather, setupWeatherLayer]);

  // ── layer visibility sync ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('floodnet-heatmap')) {
      map.setLayoutProperty('floodnet-heatmap', 'visibility', showHeatmap ? 'visible' : 'none');
    }
    if (map.getLayer('floodnet-route')) {
      map.setLayoutProperty('floodnet-route', 'visibility', showRoute ? 'visible' : 'none');
      map.setLayoutProperty('floodnet-route-outline', 'visibility', showRoute ? 'visible' : 'none');
    }

    // Toggle markers visibility
    markersRef.current.forEach(m => {
      const el = m.getElement();
      el.style.display = showMarkers ? 'block' : 'none';
    });
  }, [showHeatmap, showRoute, showMarkers]);

  // Re-render when plan changes
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      const isNewPlan = plan !== prevPlanRef.current && plan !== null;
      prevPlanRef.current = plan;
      renderPlan(map, isNewPlan);
    }
  }, [plan, renderPlan]);

  // Fly to user location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    userMarkerRef.current?.remove();

    const el = document.createElement('div');
    el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:4px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.35),0 2px 12px rgba(0,0,0,0.5);animation:pulse-ring 2s ease-out infinite"></div>`;
    const marker = new mapboxgl.Marker({ element: el.firstElementChild as HTMLElement })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 12, closeButton: false, maxWidth: '200px', className: 'floodnet-popup' })
          .setHTML(`<div style="font-family:Space Grotesk,system-ui;padding:8px;background:rgba(15,23,42,0.95);border-radius:8px;border:1px solid rgba(255,255,255,0.15);"><strong style="font-size:12px;color:#fff;">📍 ${userLocation.city}</strong><p style="font-size:10px;color:rgba(255,255,255,0.65);margin:4px 0 0;">Your location</p></div>`)
      )
      .addTo(map);
    userMarkerRef.current = marker;
    // Never auto-zoom to user location — only zoom when a plan is generated
  }, [userLocation]);

  // ── Render community report markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old community markers
    communityMarkersRef.current.forEach(m => m.remove());
    communityMarkersRef.current = [];

    if (!showCommunity || !communityReports?.length) return;

    communityReports.forEach(report => {
      const el = communityMarkerEl(report.reportType, report.severity);
      const age = Math.round((Date.now() - new Date(report.createdAt).getTime()) / 60000);
      const ageStr = age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`;
      const icon = REPORT_ICONS[report.reportType] || '📍';

      const popup = new mapboxgl.Popup({
        offset: 16, closeButton: false, maxWidth: '220px', className: 'floodnet-popup',
      }).setHTML(
        `<div style="font-family:Space Grotesk,system-ui;padding:8px;background:rgba(15,23,42,0.95);border-radius:8px;border:1px solid rgba(255,255,255,0.15);">
          <strong style="font-size:12px;color:#fff;">${icon} ${report.reportType.replace('_', ' ').toUpperCase()}</strong>
          <p style="font-size:10px;color:rgba(255,255,255,0.65);margin:4px 0 0;">Severity: ${report.severity} · ${ageStr}</p>
          ${report.description ? `<p style="font-size:10px;color:rgba(255,255,255,0.5);margin:4px 0 0;">${report.description}</p>` : ''}
          <p style="font-size:9px;color:rgba(255,255,255,0.35);margin:4px 0 0;">👍 ${report.confirmCount} confirmations</p>
        </div>`
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([report.lng, report.lat])
        .setPopup(popup)
        .addTo(map);
      communityMarkersRef.current.push(marker);
    });
  }, [communityReports, showCommunity]);

  // ── Active legend config ──
  const activeDef = OWM_LAYERS.find(l => l.id === activeWeatherLayer)!;

  const weatherBadge = plan?.weather_current ? (
    <div className="absolute top-4 right-14 bg-gray-900/90 backdrop-blur-sm border border-white/20 px-3 py-2 rounded-lg z-10 pointer-events-none shadow-lg">
      <p className="text-[10px] font-head uppercase tracking-wider text-blue-300 mb-1">Live Weather</p>
      <p className="text-xs font-bold text-white">{plan.weather_current.temp_c}°C · {plan.weather_current.description}</p>
      <p className="text-[10px] text-white/60">
        Rain: {plan.weather_current.rainfall_mm}mm · Humidity: {plan.weather_current.humidity_pct}% · Wind: {plan.weather_current.wind_speed_kmh}km/h
      </p>
    </div>
  ) : null;

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-2xl border-2 border-black shadow-md overflow-hidden bg-slate-900"
      />

      {!mapRef.current && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-blue-400 font-head animate-pulse uppercase tracking-widest text-xs">Initializing Globe...</p>
        </div>
      )}

      {weatherBadge}

      {/* ── Layer Toggle Panel — bottom-right, opens upward ── */}
      <div className="absolute bottom-16 right-3 z-20 flex flex-col items-end">
        {layerPanelOpen && (
          <div className="mb-2 w-52 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl p-3 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto">
            {/* Weather layers (radio) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-head uppercase tracking-wider text-blue-300">Weather Layer</p>
                <button
                  onClick={() => setShowWeather(!showWeather)}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${showWeather ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                >
                  {showWeather ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="space-y-0.5">
                {OWM_LAYERS.map(layer => (
                  <button
                    key={layer.id}
                    onClick={() => setActiveWeatherLayer(layer.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      activeWeatherLayer === layer.id
                        ? 'bg-blue-600/30 border border-blue-400/40 text-white'
                        : 'hover:bg-white/5 text-white/60 border border-transparent'
                    }`}
                  >
                    <span className="text-sm">{layer.icon}</span>
                    <span className="text-[11px] font-bold">{layer.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Data layers (checkboxes) */}
            <div className="border-t border-white/10 pt-2">
              <p className="text-[10px] font-head uppercase tracking-wider text-blue-300 mb-2">Data Layers</p>
              <div className="space-y-1">
                {[
                  { label: 'AI Risk Heatmap', checked: showHeatmap, toggle: () => setShowHeatmap(!showHeatmap), icon: '🔥' },
                  { label: 'Markers & Zones', checked: showMarkers, toggle: () => setShowMarkers(!showMarkers), icon: '📍' },
                  { label: 'Evacuation Route', checked: showRoute, toggle: () => setShowRoute(!showRoute), icon: '🛤️' },
                  { label: 'Community Reports', checked: showCommunity, toggle: () => setShowCommunity(!showCommunity), icon: '📢' },
                  { label: 'Obstacles / Hazards', checked: showObstacles, toggle: () => setShowObstacles(!showObstacles), icon: '🚧' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.toggle}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className={`text-[11px] font-bold ${item.checked ? 'text-white' : 'text-white/40'}`}>{item.label}</span>
                    <span className={`ml-auto w-3 h-3 rounded border-2 flex items-center justify-center ${
                      item.checked ? 'bg-blue-500 border-blue-400' : 'border-gray-500'
                    }`}>
                      {item.checked && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Toggle button — always visible at bottom-right */}
        <button
          onClick={() => setLayerPanelOpen(!layerPanelOpen)}
          className={`w-8 h-8 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center text-white transition-colors shadow-lg cursor-pointer ${layerPanelOpen ? 'bg-blue-600/80 hover:bg-blue-600' : 'bg-gray-900/90 hover:bg-gray-800'}`}
          title="Toggle Layers"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </button>
      </div>

      {/* ── Tracking badge ── */}
      {plan && (
        <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-white/20 p-2.5 rounded-lg shadow-lg z-10 pointer-events-none">
          <p className="text-[10px] font-head uppercase tracking-wider text-blue-300 mb-0.5">
            Tracking: {plan.location}
          </p>
          <p className="text-[9px] text-white/60">
            {plan.flood_zones?.length || 0} zones · {plan.safe_zones?.length || 0} shelters · {plan.hospitals?.length || 0} hospitals · {plan.rescue_teams?.length || 0} teams{plan.obstacles?.length ? ` · ${plan.obstacles.length} hazards` : ''}
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

      {/* ── Dynamic Legend ── */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-white/20 p-3 rounded-xl shadow-lg z-10 pointer-events-none">
        <div className="space-y-2">
          {/* Weather layer gradient */}
          {showWeather && (
            <div>
              <p className="text-[9px] font-bold text-blue-300 uppercase tracking-wider mb-1">
                {activeDef.icon} {activeDef.label}
              </p>
              <div className="w-32 h-2.5 rounded-full" style={{ background: activeDef.gradient }} />
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-white/50">{activeDef.scaleLabels[0]}</span>
                <span className="text-[8px] text-white/50">{activeDef.scaleLabels[1]}</span>
              </div>
            </div>
          )}

          {/* Marker legend */}
          <div className="border-t border-white/10 pt-1.5 space-y-1">
            {[
              { color: '#EF4444', label: 'Flood Zone' },
              { color: '#22C55E', label: 'Safe Shelter' },
              { color: '#FFFFFF', label: 'Hospital', border: '#DC2626' },
              { color: '#3B82F6', label: 'Rescue Team' },
              { color: '#38bdf8', label: 'Evacuation Route' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: item.color,
                    border: item.border ? `2px solid ${item.border}` : '1px solid rgba(255,255,255,0.3)',
                    boxSizing: 'border-box',
                  }}
                />
                <span className="text-[9px] font-bold text-white/70">{item.label}</span>
              </div>
            ))}
            {showHeatmap && plan?.heatmap_points?.length ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{
                  background: 'linear-gradient(135deg, #00c8ff, #ff0, #f00)',
                }} />
                <span className="text-[9px] font-bold text-white/70">AI Risk Heatmap</span>
              </div>
            ) : null}
            {showCommunity && communityReports && communityReports.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EAB308', border: '1.5px solid white', boxSizing: 'border-box' }} />
                <span className="text-[9px] font-bold text-white/70">Community Reports ({communityReports.length})</span>
              </div>
            )}
            {showObstacles && plan?.obstacles?.length ? (
              <div className="flex items-center gap-1.5">
                <div className="w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid #F97316' }} />
                <span className="text-[9px] font-bold text-white/70">Obstacles ({plan.obstacles.length})</span>
              </div>
            ) : null}
          </div>

          {/* Attribution */}
          <p className="text-[7px] text-white/30 border-t border-white/10 pt-1">
            Weather data © OpenWeatherMap
          </p>
        </div>
      </div>
    </div>
  );
}
