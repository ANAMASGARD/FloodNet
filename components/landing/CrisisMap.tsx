"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

interface CrisisMapProps {
  className?: string;
}

/* ─── Dummy hospital data (markers) ─── */
const hospitals = [
  { name: "City General Hospital", lng: -73.985, lat: 40.748, beds: 12, specialty: "Cardiac", capacity: 78 },
  { name: "St. Mary's Trauma Center", lng: -73.968, lat: 40.763, beds: 5, specialty: "Trauma", capacity: 92 },
  { name: "University Medical Center", lng: -74.002, lat: 40.738, beds: 8, specialty: "Neuro", capacity: 65 },
  { name: "Mercy Hospital", lng: -73.955, lat: 40.730, beds: 15, specialty: "General", capacity: 55 },
  { name: "Brooklyn Medical", lng: -73.975, lat: 40.688, beds: 6, specialty: "Pediatric", capacity: 81 },
];

/* ─── Dummy ambulance positions ─── */
const ambulances = [
  { id: "AMB-01", lng: -73.978, lat: 40.752, status: "En Route" },
  { id: "AMB-02", lng: -73.990, lat: 40.735, status: "Available" },
  { id: "AMB-03", lng: -73.960, lat: 40.745, status: "En Route" },
  { id: "AMB-04", lng: -73.972, lat: 40.710, status: "Available" },
];

/* ─── Dummy patient emergency ─── */
const patient = { lng: -73.980, lat: 40.742, label: "Emergency" };

export function CrisisMap({ className }: CrisisMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);

  /* ── Ask for browser geolocation ── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude });
      },
      () => {
        /* denied or error — fall back to default NYC */
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || "";

    const center: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : [-73.978, 40.740];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center,
      zoom: 13,
      pitch: 50,
      bearing: -15,
      antialias: true,
      interactive: true,
      attributionControl: false,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }),
      "top-right"
    );

    map.current.on("load", () => {
      setLoaded(true);

      /* ── Hospital markers ── */
      hospitals.forEach((h) => {
        const el = document.createElement("div");
        el.className = "hospital-marker";
        el.innerHTML = `
          <div style="
            width: 32px; height: 32px;
            background: linear-gradient(135deg, #22C55E, #16A34A);
            border: 2.5px solid #fff;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.15);
            cursor: pointer;
            transition: transform 0.2s;
            font-size: 14px;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            🏥
          </div>
        `;

        const capacityColor = h.capacity > 85 ? "#EF4444" : h.capacity > 70 ? "#F97316" : "#22C55E";

        new mapboxgl.Marker({ element: el })
          .setLngLat([h.lng, h.lat])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              className: "crisis-map-popup",
              maxWidth: "240px",
            }).setHTML(`
              <div style="
                font-family: 'Space Grotesk', sans-serif;
                padding: 4px;
              ">
                <div style="font-family: 'Archivo Black', sans-serif; font-size: 13px; margin-bottom: 6px; color: #1a0a0e;">
                  ${h.name}
                </div>
                <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                  <span style="
                    background: #22C55E20; color: #16A34A;
                    padding: 2px 8px; border-radius: 4px;
                    font-size: 11px; font-weight: 600;
                    border: 1px solid #22C55E40;
                  ">${h.beds} beds</span>
                  <span style="
                    background: #3B82F620; color: #2563EB;
                    padding: 2px 8px; border-radius: 4px;
                    font-size: 11px; font-weight: 600;
                    border: 1px solid #3B82F640;
                  ">${h.specialty}</span>
                </div>
                <div style="font-size: 11px; color: #6B5C52; margin-bottom: 4px;">Capacity</div>
                <div style="
                  height: 6px; background: #F5EDE4;
                  border-radius: 3px; overflow: hidden;
                  border: 1px solid #E8DDD1;
                ">
                  <div style="
                    height: 100%; width: ${h.capacity}%;
                    background: ${capacityColor};
                    border-radius: 3px;
                    transition: width 0.5s;
                  "></div>
                </div>
                <div style="font-size: 10px; color: #6B5C52; margin-top: 3px; text-align: right;">
                  ${h.capacity}% occupied
                </div>
              </div>
            `)
          )
          .addTo(map.current!);
      });

      /* ── Ambulance markers (animated) ── */
      ambulances.forEach((a) => {
        const el = document.createElement("div");
        el.className = "ambulance-marker";
        const isEnRoute = a.status === "En Route";
        el.innerHTML = `
          <div style="position: relative;">
            ${
              isEnRoute
                ? `<div style="
                    position: absolute; inset: -6px;
                    border: 2px solid #3B82F6;
                    border-radius: 50%;
                    animation: ambulance-pulse 2s ease-in-out infinite;
                    opacity: 0.5;
                  "></div>`
                : ""
            }
            <div style="
              width: 28px; height: 28px;
              background: ${isEnRoute ? "linear-gradient(135deg, #3B82F6, #1D4ED8)" : "linear-gradient(135deg, #6B7280, #4B5563)"};
              border: 2.5px solid #fff;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 2px 8px ${isEnRoute ? "rgba(59,130,246,0.5)" : "rgba(107,114,128,0.3)"};
              cursor: pointer;
              transition: transform 0.2s;
              font-size: 12px;
            " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
              🚑
            </div>
          </div>
        `;

        new mapboxgl.Marker({ element: el })
          .setLngLat([a.lng, a.lat])
          .setPopup(
            new mapboxgl.Popup({
              offset: 20,
              className: "crisis-map-popup",
              maxWidth: "200px",
            }).setHTML(`
              <div style="font-family: 'Space Grotesk', sans-serif; padding: 4px;">
                <div style="font-family: 'Archivo Black', sans-serif; font-size: 13px; margin-bottom: 4px; color: #1a0a0e;">
                  ${a.id}
                </div>
                <span style="
                  background: ${isEnRoute ? "#3B82F620" : "#22C55E20"};
                  color: ${isEnRoute ? "#2563EB" : "#16A34A"};
                  padding: 2px 8px; border-radius: 12px;
                  font-size: 11px; font-weight: 600;
                  border: 1px solid ${isEnRoute ? "#3B82F640" : "#22C55E40"};
                ">● ${a.status}</span>
              </div>
            `)
          )
          .addTo(map.current!);
      });

      /* ── Patient emergency marker (pulsing red) ── */
      const patientEl = document.createElement("div");
      patientEl.innerHTML = `
        <div style="position: relative;">
          <div style="
            position: absolute; inset: -10px;
            border: 2px solid #EF4444;
            border-radius: 50%;
            animation: ambulance-pulse 1.5s ease-in-out infinite;
            opacity: 0.6;
          "></div>
          <div style="
            position: absolute; inset: -20px;
            border: 1.5px solid #EF4444;
            border-radius: 50%;
            animation: ambulance-pulse 1.5s ease-in-out infinite 0.3s;
            opacity: 0.3;
          "></div>
          <div style="
            width: 24px; height: 24px;
            background: linear-gradient(135deg, #EF4444, #DC2626);
            border: 2.5px solid #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 12px rgba(239,68,68,0.5), 0 0 30px rgba(239,68,68,0.2);
            font-size: 11px;
          ">
            ⚠️
          </div>
        </div>
      `;

      new mapboxgl.Marker({ element: patientEl })
        .setLngLat([patient.lng, patient.lat])
        .setPopup(
          new mapboxgl.Popup({
            offset: 20,
            className: "crisis-map-popup",
            maxWidth: "200px",
          }).setHTML(`
            <div style="font-family: 'Space Grotesk', sans-serif; padding: 4px;">
              <div style="font-family: 'Archivo Black', sans-serif; font-size: 13px; color: #DC2626; margin-bottom: 4px;">
                🚨 Active Emergency
              </div>
              <div style="font-size: 11px; color: #6B5C52;">
                Cardiac event detected<br/>
                Priority: <strong style="color: #DC2626;">Level 1</strong>
              </div>
            </div>
          `)
        )
        .addTo(map.current!);

      /* ── User location marker (if geolocation granted) ── */
      if (userLocation) {
        const userEl = document.createElement("div");
        userEl.innerHTML = `
          <div style="position: relative;">
            <div style="
              position: absolute; inset: -8px;
              border: 2px solid #3B82F6;
              border-radius: 50%;
              animation: ambulance-pulse 2s ease-in-out infinite;
              opacity: 0.4;
            "></div>
            <div style="
              width: 16px; height: 16px;
              background: #3B82F6;
              border: 3px solid #fff;
              border-radius: 50%;
              box-shadow: 0 0 12px rgba(59,130,246,0.6);
            "></div>
          </div>
        `;

        new mapboxgl.Marker({ element: userEl })
          .setLngLat([userLocation.lng, userLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 15, className: "crisis-map-popup", maxWidth: "180px" })
              .setHTML(`
                <div style="font-family: 'Space Grotesk', sans-serif; padding: 4px;">
                  <div style="font-family: 'Archivo Black', sans-serif; font-size: 12px; color: #3B82F6; margin-bottom: 2px;">
                    📍 Your Location
                  </div>
                  <div style="font-size: 10px; color: #6B5C52;">Live GPS position</div>
                </div>
              `)
          )
          .addTo(map.current!);

        map.current!.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14, duration: 1500 });
      }

      /* ── Add 3D buildings ── */
      if (map.current!.getStyle().layers) {
        map.current!.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": "#c4b5a3",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.5,
          },
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation]);

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 border-border ${className ?? ""}`}>
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full min-h-[350px]" />

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-md border-2 border-border rounded-lg p-3 shadow-md text-xs font-sans z-10">
        <div className="font-head text-[11px] mb-2 text-foreground">Live Map Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500 inline-block border border-white" />
            <span className="text-muted-foreground">Hospital</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-white" />
            <span className="text-muted-foreground">Ambulance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block border border-white pulse-dot" />
            <span className="text-muted-foreground">Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border-2 border-white" style={{ boxShadow: "0 0 6px rgba(59,130,246,0.5)" }} />
            <span className="text-muted-foreground">You</span>
          </div>
        </div>
      </div>

      {/* Status overlay */}
      <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md rounded-lg px-3 py-1.5 shadow-md z-10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white pulse-dot" />
        <span className="text-[11px] font-head text-white tracking-wide">LIVE</span>
      </div>

      {/* CSS for the pulse animation */}
      <style jsx>{`
        @keyframes ambulance-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
