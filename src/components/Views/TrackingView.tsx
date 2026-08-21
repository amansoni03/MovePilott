"use client";

import React, { useState } from 'react';
import { useApp, Route, Vehicle } from '@/context/AppContext';
import { LiveMap } from '@/components/LiveMap';
import { 
  Bus, User, MapPin, Gauge, Clock, ShieldAlert,
  Play, Square, Compass, RefreshCw, Layers
} from 'lucide-react';

export const TrackingView: React.FC = () => {
  const { 
    vehicles, routes, drivers, students, simulationActive, 
    setSimulationActive, triggerEmergency, addToast
  } = useApp();

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');

  // 1. Fetch active vehicles with routes
  const trackingBuses = vehicles.filter(v => v.routeId && (v.status === 'active' || v.status === 'emergency'));

  // 2. Filter logic
  const filteredBuses = trackingBuses.filter(v => {
    if (selectedRouteId && v.routeId !== selectedRouteId) return false;
    if (selectedBusId && v.id !== selectedBusId) return false;
    return true;
  });

  const getRouteDetails = (routeId: string) => {
    return routes.find(r => r.id === routeId);
  };

  const getDriverDetails = (driverId: string) => {
    return drivers.find(d => d.id === driverId);
  };

  const activeRoute = selectedRouteId ? routes.find(r => r.id === selectedRouteId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-800 fade-in">
      {/* Map Content - 3 columns */}
      <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col space-y-4">
        {/* Map Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600 animate-spin-slow" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">GPS Tracking Console</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Live transponder feeds sync every 4 seconds</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Route */}
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer text-slate-700"
            >
              <option value="">All Routes</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.routeNumber} ({r.name.split(' ')[0]})</option>
              ))}
            </select>

            {/* Simulation controls */}
            <button
              onClick={() => {
                setSimulationActive(!simulationActive);
                addToast(`GPS Simulation ${!simulationActive ? 'started' : 'paused'}`, 'info');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                simulationActive
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {simulationActive ? (
                <>
                  <Square className="w-3 h-3 fill-amber-700 text-amber-700" /> Pause Simulation
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-emerald-700 text-emerald-700" /> Resume Simulation
                </>
              )}
            </button>
          </div>
        </div>

        {/* The map wrapper (matching DashboardView fixed height pattern) */}
        <div className="h-[520px] w-full bg-slate-50 rounded-2xl relative overflow-hidden border border-slate-100 shadow-inner">
          <LiveMap />
        </div>
      </div>

      {/* Control Sidebar Panel - 1 column */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col h-[590px] lg:h-auto overflow-hidden">
        <h3 className="font-bold text-slate-900 text-sm">Active Fleet Feeds</h3>
        <p className="text-[10px] text-slate-400 font-semibold mb-4">Click a bus to display route details</p>

        {/* Bus List Scroll */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredBuses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-10">
              <Bus className="w-8 h-8 mb-2 stroke-[1.5]" />
              <p>No active vehicles tracking.</p>
              <p className="text-[10px]">Verify route is running.</p>
            </div>
          ) : (
            filteredBuses.map((bus) => {
              const route = getRouteDetails(bus.routeId);
              const driver = getDriverDetails(bus.driverId);
              const isSelected = selectedBusId === bus.id;
              
              const studentsOnboard = students.filter(s => s.busId === bus.id && s.boardingStatus === 'boarded').length;

              return (
                <div
                  key={bus.id}
                  onClick={() => setSelectedBusId(isSelected ? '' : bus.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs font-semibold ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/10' 
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-blue-600" /> {bus.busNumber}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      bus.status === 'emergency' ? 'bg-red-100 text-red-800' :
                      bus.currentSpeed > 60 ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {bus.status === 'emergency' ? 'SOS' : bus.currentSpeed > 60 ? 'OVERSPEED' : 'ONLINE'}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-500 font-medium">
                    <p className="flex justify-between">
                      <span>Driver:</span>
                      <strong className="text-slate-800">{driver?.name || 'Unassigned'}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Route:</span>
                      <strong className="text-slate-800">{route?.routeNumber || 'None'}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Speed:</span>
                      <strong className="text-slate-800">{bus.currentSpeed} km/h</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>ETA:</span>
                      <strong className="text-slate-800">{route?.expectedArrivalTime || 'None'}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Onboard:</span>
                      <strong className="text-slate-800">{studentsOnboard} / {bus.capacity}</strong>
                    </p>
                  </div>

                  {/* SOS action helper */}
                  {bus.status === 'emergency' && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-100 text-[10px] text-red-700 rounded-lg flex items-center gap-1.5 font-bold animate-pulse">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>Breakdown reported!</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Integration Details conceptual block */}
        <div className="border-t border-slate-100 pt-4 mt-4 space-y-2.5 text-[10px]">
          <div className="flex items-center justify-between text-slate-400 uppercase font-bold tracking-wider">
            <span>GPS Provider Status</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
            </span>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 font-medium space-y-1">
            <p>API Provider: <strong className="text-slate-700">AIS-140 Demo GPS</strong></p>
            <p>Update rate: <strong className="text-slate-700">4000ms ticks</strong></p>
            <p>API Endpoint: <strong className="text-slate-700 font-mono">https://api.vts.gps/v1/</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};
