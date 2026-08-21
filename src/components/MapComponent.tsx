"use client";

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp, Route, Vehicle } from '@/context/AppContext';
import { Bus, User, Users, MapPin, Gauge, Clock, ShieldAlert } from 'lucide-react';

// Cache custom icons using Leaflet divIcon to prevent re-creation on every tick
const markerIconCache = new Map<string, L.DivIcon>();

const createCustomMarker = (bus: Vehicle, route: Route | undefined) => {
  let color = 'bg-blue-600'; // Scheduled / Inactive
  let ring = 'ring-blue-100';
  let pulseClass = '';

  if (bus.status === 'emergency') {
    color = 'bg-red-600';
    ring = 'ring-red-200';
    pulseClass = 'bus-pulse-emergency';
  } else if (bus.status === 'active') {
    if (route && route.status === 'running') {
      if (bus.busNumber === 'BUS 14' || bus.currentSpeed > 60) {
        color = 'bg-amber-500';
        ring = 'ring-amber-100';
      } else {
        color = 'bg-emerald-500';
        ring = 'ring-emerald-100';
        pulseClass = 'bus-pulse-active';
      }
    }
  } else if (bus.status === 'maintenance') {
    color = 'bg-slate-500';
    ring = 'ring-slate-100';
  }

  const cacheKey = `${bus.id}-${bus.status}-${route?.status || 'none'}-${color}`;
  if (markerIconCache.has(cacheKey)) {
    return markerIconCache.get(cacheKey)!;
  }

  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-lg text-white ${color} ${ring} ring-4 ${pulseClass}">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
};

// Map Fix Controller: Handles size invalidation & initial fleet bounds fitting
const MapContainerFixController: React.FC<{ vehicles: Vehicle[]; routes: Route[] }> = ({ vehicles, routes }) => {
  const map = useMap();
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    // Force Leaflet to recalculate container dimensions when mounted or resized
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // IntersectionObserver: Triggers invalidateSize whenever map container becomes visible in viewport
    const container = map.getContainer();
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && container) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            map.invalidateSize();
          }
        });
      });
      observer.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleResize);
      if (observer && container) {
        observer.unobserve(container);
        observer.disconnect();
      }
    };
  }, [map]);

  // Fit bounds to display active buses on map load
  useEffect(() => {
    if (hasFitBoundsRef.current) return;

    const activeVehicles = vehicles.filter(v => v.routeId && (v.status === 'active' || v.status === 'emergency'));
    const coords: [number, number][] = [];

    activeVehicles.forEach(v => {
      const r = routes.find(route => route.id === v.routeId);
      if (r && Array.isArray(r.path) && r.path.length > 0) {
        const c = r.path[r.currentPathIndex] || r.path[0];
        if (c && c[0] && c[1] && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])) {
          coords.push([c[0], c[1]]);
        }
      }
    });

    if (coords.length > 0) {
      hasFitBoundsRef.current = true;
      try {
        if (coords.length === 1) {
          map.setView(coords[0], 13);
        } else {
          map.fitBounds(coords as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 14 });
        }
      } catch {
        map.setView([26.8500, 80.9499], 12);
      }
    }
  }, [vehicles, routes, map]);

  return null;
};

const MapComponent: React.FC = () => {
  const { vehicles, routes, drivers, students } = useApp();

  // Compute default center (Lucknow / UP or active route)
  const defaultCenter: [number, number] = (() => {
    const activeRunning = routes.find(r => r.status === 'running' && Array.isArray(r.path) && r.path.length > 0);
    if (activeRunning && activeRunning.path[0]) {
      return [activeRunning.path[0][0], activeRunning.path[0][1]];
    }
    return [26.8500, 80.9499]; // Lucknow, Uttar Pradesh default
  })();

  const getDriver = (driverId: string) => drivers.find(d => d.id === driverId);
  const getRoute = (routeId: string) => routes.find(r => r.id === routeId);

  return (
    <div className="w-full h-full min-h-[400px] relative border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        className="w-full h-full z-10"
        zoomControl={true}
      >
        {/* Standard OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapContainerFixController vehicles={vehicles} routes={routes} />

        {/* Polylines for active routes */}
        {routes
          .filter(r => r.status === 'running' && Array.isArray(r.path) && r.path.length > 0)
          .map((route, idx) => {
            const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
            return (
              <Polyline
                key={route.id}
                positions={route.path}
                color={colors[idx % colors.length]}
                weight={5}
                opacity={0.8}
              />
            );
          })}

        {/* Bus Markers */}
        {vehicles
          .filter(v => v.routeId && (v.status === 'active' || v.status === 'emergency'))
          .map((bus) => {
            const route = getRoute(bus.routeId);
            if (!route) return null;

            const currentCoord = route.path[route.currentPathIndex] || route.path[0];
            if (!currentCoord) return null;

            const driver = getDriver(bus.driverId);
            const activeStudents = students.filter(s => s.busId === bus.id && s.boardingStatus === 'boarded').length;

            return (
              <Marker
                key={bus.id}
                position={[currentCoord[0], currentCoord[1]]}
                icon={createCustomMarker(bus, route)}
              >
                <Popup>
                  <div className="p-3 w-56 text-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Bus className="w-4 h-4 text-blue-600" /> {bus.busNumber}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        bus.status === 'emergency' ? 'bg-red-100 text-red-800' :
                        route.status === 'running' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {bus.status === 'emergency' ? 'SOS ALERT' : route.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Driver: <strong className="text-slate-800">{driver?.name || 'Unassigned'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Route: <strong className="text-slate-800">{route.routeNumber}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Onboard: <strong className="text-slate-800">{activeStudents} / {bus.capacity}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        <span>Speed: <strong className="text-slate-800">{bus.currentSpeed} km/h</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ETA: <strong className="text-slate-800">{route.expectedArrivalTime}</strong></span>
                      </div>
                    </div>

                    {bus.status === 'emergency' && (
                      <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-1.5 text-[10px] font-bold text-red-700 mt-2 animate-pulse">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        <span>EMERGENCY PROTOCOL ACTIVE</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
