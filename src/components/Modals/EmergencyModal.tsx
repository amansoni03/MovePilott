"use client";

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AlertOctagon, X, ShieldAlert } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { vehicles, routes, triggerEmergency, addToast } = useApp();

  const [type, setType] = useState<'Accident' | 'Medical Emergency' | 'Vehicle Breakdown' | 'Route Deviation' | 'Overspeeding' | 'Student Safety' | 'GPS Offline'>('Vehicle Breakdown');
  const [busId, setBusId] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium'>('high');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  // Show all buses that could need emergency help — active, running, even already in emergency
  // Exclude only fully inactive/decommissioned buses
  const activeBuses = vehicles
    .filter(v => v.status !== 'inactive')
    .sort((a, b) => {
      // Sort: emergency first, then active, then maintenance
      const order: Record<string, number> = { emergency: 0, active: 1, maintenance: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busId) {
      addToast('Please select a vehicle.', 'error');
      return;
    }

    const selectedBus = vehicles.find(v => v.id === busId);
    if (!selectedBus) return;

    triggerEmergency({
      busId,
      routeId: selectedBus.routeId,
      location: { lat: 12.9716, lng: 77.5946 }, // centered on Bangalore
      severity,
      type,
      description: description || `${type} reported on ${selectedBus.busNumber}`
    });

    addToast(`Critical Alert: ${type} triggered for ${selectedBus.busNumber}!`, 'error');
    
    // Reset and close
    setBusId('');
    setType('Vehicle Breakdown');
    setSeverity('high');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-600 text-white">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
            <h3 className="font-semibold text-lg">Trigger SOS / Emergency Alert</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-red-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-800 text-xs">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold uppercase tracking-wider">Warning Action</p>
              <p className="mt-0.5 text-red-600">
                Triggering an emergency changes the vehicle status to Emergency, generates alert notifications, and pings the map marker red.
              </p>
            </div>
          </div>

          {/* Emergency Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Emergency Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-slate-50 font-medium"
            >
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Accident">Accident</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Route Deviation">Route Deviation</option>
              <option value="Overspeeding">Overspeeding</option>
              <option value="Student Safety">Student Safety</option>
              <option value="GPS Offline">GPS Offline</option>
            </select>
          </div>

          {/* Select Bus */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Select Affected Bus
            </label>
            {activeBuses.length === 0 ? (
              <div className="w-full px-3.5 py-2.5 border border-red-200 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                ⚠️ No vehicles found. Make sure vehicles are added to the fleet.
              </div>
            ) : (
              <select
                value={busId}
                onChange={(e) => setBusId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-slate-50 font-medium"
                required
              >
                <option value="">-- Choose Affected Bus ({activeBuses.length} available) --</option>
                {activeBuses.map(v => {
                  const route = routes.find(r => r.id === v.routeId);
                  const statusLabel = v.status === 'emergency' ? ' 🚨 EMERGENCY' : v.status === 'maintenance' ? ' 🔧 Maintenance' : ' ✅ Active';
                  return (
                    <option key={v.id} value={v.id}>
                      {v.busNumber} ({v.registrationNumber}){statusLabel}{route ? ` — ${route.routeNumber}` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Severity Level
            </label>
            <div className="flex gap-2">
              {(['medium', 'high', 'critical'] as const).map(level => {
                const colors = {
                  medium: 'border-amber-200 text-amber-800 bg-amber-50 checked:bg-amber-500',
                  high: 'border-orange-200 text-orange-800 bg-orange-50 checked:bg-orange-500',
                  critical: 'border-red-200 text-red-800 bg-red-50 checked:bg-red-500',
                }[level];
                
                const activeColors = {
                  medium: 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700',
                  high: 'bg-orange-600 border-orange-600 text-white hover:bg-orange-700',
                  critical: 'bg-red-600 border-red-600 text-white hover:bg-red-700',
                }[level];

                const isSelected = severity === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`flex-1 py-2 border text-xs font-semibold rounded-xl uppercase transition-all cursor-pointer ${
                      isSelected ? activeColors : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Incident Description
            </label>
            <textarea
              placeholder="Provide exact details of the incident (e.g. engine smoke, flat tire)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-slate-50 h-24"
              required
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-red-600/20"
            >
              Trigger SOS Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
