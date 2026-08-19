"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Trash, X, Route as RouteIcon, MapPin, Search, Loader2 } from 'lucide-react';

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StopItem {
  name: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  query: string;
  suggestions: Array<{ display_name: string; lat: string; lon: string }>;
  loading: boolean;
}

export const AddRouteModal: React.FC<AddRouteModalProps> = ({ isOpen, onClose }) => {
  const { addRoute, vehicles, drivers, addToast } = useApp();

  const [routeName, setRouteName] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [busId, setBusId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [distance, setDistance] = useState(12);
  const [duration, setDuration] = useState(35);
  const [departureTime, setDepartureTime] = useState('07:30 AM');
  const [expectedArrivalTime, setExpectedArrivalTime] = useState('08:15 AM');

  // Stops with Lucknow defaults
  const [stops, setStops] = useState<StopItem[]>([
    {
      name: 'Hazratganj, Lucknow',
      lat: 26.8500,
      lng: 80.9499,
      scheduledTime: '07:30 AM',
      query: 'Hazratganj, Lucknow',
      suggestions: [],
      loading: false
    },
    {
      name: 'Krishna Nagar, Lucknow',
      lat: 26.8001,
      lng: 80.8935,
      scheduledTime: '08:05 AM',
      query: 'Krishna Nagar, Lucknow',
      suggestions: [],
      loading: false
    }
  ]);

  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

  if (!isOpen) return null;

  // Search places via server-backed Geocode API route
  const searchPlaces = async (index: number, queryText: string) => {
    if (!queryText || queryText.length < 2) {
      setStops(prev => prev.map((st, i) => i === index ? { ...st, suggestions: [], loading: false } : st));
      return;
    }

    setStops(prev => prev.map((st, i) => i === index ? { ...st, loading: true } : st));

    try {
      const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(queryText)}`);
      const data = await res.json();

      setStops(prev => prev.map((st, i) => i === index ? {
        ...st,
        suggestions: data || [],
        loading: false
      } : st));
    } catch {
      setStops(prev => prev.map((st, i) => i === index ? { ...st, suggestions: [], loading: false } : st));
    }
  };

  const handleQueryChange = (index: number, val: string) => {
    setStops(prev => prev.map((st, i) => i === index ? { ...st, query: val, name: val } : st));

    if (debounceTimers.current[index]) clearTimeout(debounceTimers.current[index]);
    debounceTimers.current[index] = setTimeout(() => {
      searchPlaces(index, val);
    }, 400);
  };

  const selectSuggestion = (index: number, sugg: { display_name: string; lat: string; lon: string }) => {
    const cleanName = sugg.display_name.split(',').slice(0, 3).join(',').trim();
    setStops(prev => prev.map((st, i) => i === index ? {
      ...st,
      name: cleanName,
      query: cleanName,
      lat: parseFloat(sugg.lat),
      lng: parseFloat(sugg.lon),
      suggestions: []
    } : st));
  };

  const handleAddStop = () => {
    const lastStop = stops[stops.length - 1] || { lat: 26.8500, lng: 80.9499 };
    setStops(prev => [
      ...prev,
      {
        name: `Stop ${prev.length + 1}`,
        lat: lastStop.lat + 0.01,
        lng: lastStop.lng + 0.01,
        scheduledTime: '08:15 AM',
        query: '',
        suggestions: [],
        loading: false
      }
    ]);
  };

  const handleRemoveStop = (index: number) => {
    setStops(prev => prev.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, field: keyof StopItem, value: any) => {
    setStops(prev => prev.map((st, i) => i === index ? { ...st, [field]: value } : st));
  };

  // Helper to generate polyline path connecting the stops
  const generatePathBetweenStops = (stopList: StopItem[]) => {
    if (stopList.length < 2) return stopList.map(s => [s.lat, s.lng] as [number, number]);
    const path: [number, number][] = [];
    
    for (let i = 0; i < stopList.length - 1; i++) {
      const start = stopList[i];
      const end = stopList[i + 1];
      const steps = 15;
      for (let step = 0; step <= steps; step++) {
        const ratio = step / steps;
        const lat = start.lat + (end.lat - start.lat) * ratio + Math.sin(ratio * Math.PI) * 0.002 * (step % 2 === 0 ? 1 : -1);
        const lng = start.lng + (end.lng - start.lng) * ratio + Math.cos(ratio * Math.PI) * 0.002 * (step % 3 === 0 ? 1 : -1);
        path.push([lat, lng]);
      }
    }
    return path;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !routeNumber.trim() || stops.length === 0) {
      addToast('Please provide route details and at least one stop.', 'error');
      return;
    }

    addRoute({
      name: routeName.trim(),
      routeNumber: routeNumber.trim(),
      busId,
      driverId,
      studentsCount: 0,
      distance,
      duration,
      status: 'scheduled',
      departureTime,
      expectedArrivalTime,
      stops: stops.map(st => ({
        name: st.name.trim(),
        lat: Number(st.lat),
        lng: Number(st.lng),
        scheduledTime: st.scheduledTime
      }))
    });

    addToast(`Route ${routeNumber} (${routeName}) created in Uttar Pradesh!`, 'success');
    
    // Clear and reset
    setRouteName('');
    setRouteNumber('');
    setBusId('');
    setDriverId('');
    setStops([
      { name: 'Hazratganj, Lucknow', lat: 26.8500, lng: 80.9499, scheduledTime: '07:30 AM', query: 'Hazratganj, Lucknow', suggestions: [], loading: false },
      { name: 'Krishna Nagar, Lucknow', lat: 26.8001, lng: 80.8935, scheduledTime: '08:05 AM', query: 'Krishna Nagar, Lucknow', suggestions: [], loading: false }
    ]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-semibold text-base leading-tight">Add New Bus Route</h3>
              <p className="text-[11px] text-slate-400 font-medium">Smart location autocomplete enabled for Uttar Pradesh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          <div className="grid grid-cols-2 gap-4">
            {/* Route Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Route Code / Number *
              </label>
              <input
                type="text"
                placeholder="e.g. Route 23"
                value={routeNumber}
                onChange={(e) => setRouteNumber(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                required
              />
            </div>

            {/* Route Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Route Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Hazratganj ↔ Krishna Nagar"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                required
              />
            </div>

            {/* Assigned Bus */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Assign Vehicle
              </label>
              <select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
              >
                <option value="">-- Choose Bus --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.busNumber} ({v.model})</option>
                ))}
              </select>
            </div>

            {/* Assigned Driver */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Assign Driver
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
              >
                <option value="">-- Choose Driver --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                ))}
              </select>
            </div>

            {/* Distance */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Distance (km)
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Expected Duration (mins)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                required
              />
            </div>

            {/* Departure */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Departure Time
              </label>
              <input
                type="text"
                placeholder="07:30 AM"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
              />
            </div>

            {/* Arrival */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Expected Arrival
              </label>
              <input
                type="text"
                placeholder="08:30 AM"
                value={expectedArrivalTime}
                onChange={(e) => setExpectedArrivalTime(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
              />
            </div>
          </div>

          {/* Stops List with Autocomplete */}
          <div className="border-t border-slate-100 my-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Route Stops & Waypoints</h4>
                <p className="text-[11px] text-slate-400">Search any UP location (e.g., Hazratganj, Krishna Nagar, Alambagh)</p>
              </div>
              <button
                type="button"
                onClick={handleAddStop}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stop
              </button>
            </div>

            <div className="space-y-3">
              {stops.map((stop, idx) => (
                <div key={idx} className="relative bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Autocomplete Input */}
                    <div className="relative flex-1">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="Type UP location (e.g. Hazratganj, Lucknow)..."
                          value={stop.query}
                          onChange={(e) => handleQueryChange(idx, e.target.value)}
                          className="w-full pl-8 pr-8 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                        {stop.loading && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute right-2.5" />}
                      </div>

                      {/* Dropdown Suggestions */}
                      {stop.suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                          {stop.suggestions.map((sugg, sIdx) => (
                            <div
                              key={sIdx}
                              onClick={() => selectSuggestion(idx, sugg)}
                              className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-start gap-2 text-slate-700"
                            >
                              <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-snug">{sugg.display_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Scheduled Time */}
                    <input
                      type="text"
                      placeholder="07:45 AM"
                      value={stop.scheduledTime}
                      onChange={(e) => handleStopChange(idx, 'scheduledTime', e.target.value)}
                      className="w-24 px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-center font-medium"
                      required
                    />

                    {/* Delete stop button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(idx)}
                      disabled={stops.length <= 1}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Coordinates preview pill */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded-md border border-slate-100">
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <MapPin className="w-3 h-3 text-emerald-500" /> Lat: {stop.lat.toFixed(4)}, Lng: {stop.lng.toFixed(4)}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="truncate">{stop.name || 'No location selected'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-blue-600/10"
            >
              Save Route & Plot Path
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
