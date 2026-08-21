"use client";

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ToastContainer } from '@/components/ToastContainer';

// Import Views
import { DashboardView } from '@/components/Views/DashboardView';
import { TrackingView } from '@/components/Views/TrackingView';
import { RoutesView } from '@/components/Views/RoutesView';
import { StudentsView } from '@/components/Views/StudentsView';
import { DriversView } from '@/components/Views/DriversView';
import { VehiclesView } from '@/components/Views/VehiclesView';
import { AttendanceView } from '@/components/Views/AttendanceView';
import { EmergenciesView } from '@/components/Views/EmergenciesView';
import { NotificationsView } from '@/components/Views/NotificationsView';
import { ReportsView } from '@/components/Views/ReportsView';
import { SettingsView } from '@/components/Views/SettingsView';
import { RouteOptimizerView } from '@/components/Views/RouteOptimizerView';

// Import Modals
import { AddRouteModal } from '@/components/Modals/AddRouteModal';
import { AddVehicleModal } from '@/components/Modals/AddVehicleModal';
import { EditVehicleModal } from '@/components/Modals/EditVehicleModal';
import { AddStudentModal } from '@/components/Modals/AddStudentModal';
import { EditStudentModal } from '@/components/Modals/EditStudentModal';
import { AddDriverModal } from '@/components/Modals/AddDriverModal';
import { EditDriverModal } from '@/components/Modals/EditDriverModal';
import { ScanBoardingModal } from '@/components/Modals/ScanBoardingModal';
import { EmergencyModal } from '@/components/Modals/EmergencyModal';
import { Student, Driver, Vehicle } from '@/context/AppContext';


// Icons for Search Results
import { Bus, Users, Route as RouteIcon, Search, ShieldAlert, Award } from 'lucide-react';

function DashboardContainer() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile Sidebar
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [isScanBoardingOpen, setIsScanBoardingOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);


  const { vehicles, routes, students, drivers, emergencies } = useApp();

  // Global Search Filter
  const showSearchResults = searchQuery.trim().length > 0;
  
  const searchResults = {
    vehicles: vehicles.filter(v => (v.busNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (v.registrationNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase())),
    routes: routes.filter(r => (r.routeNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())),
    students: students.filter(s => (s.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.id ?? '').toLowerCase().includes(searchQuery.toLowerCase())),
    drivers: drivers.filter(d => (d.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())),
    emergencies: emergencies.filter(e => (e.type ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (e.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())),
  };

  const hasResults = 
    searchResults.vehicles.length > 0 ||
    searchResults.routes.length > 0 ||
    searchResults.students.length > 0 ||
    searchResults.drivers.length > 0 ||
    searchResults.emergencies.length > 0;

  const renderActiveView = () => {
    if (showSearchResults) {
      return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6 fade-in text-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Search className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Search Results for "{searchQuery}"</h3>
          </div>

          {!hasResults ? (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold">
              No matching records found. Try another search.
            </div>
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 text-xs font-semibold">
              {/* Students Results */}
              {searchResults.students.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Students ({searchResults.students.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {searchResults.students.slice(0, 4).map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => { setSearchQuery(''); setActiveTab('students'); }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 transition-colors cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold leading-none">Class {s.class}-{s.section} • Stop: {s.pickupStop}</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-700">{s.boardingStatus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles Results */}
              {searchResults.vehicles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5" /> Vehicles ({searchResults.vehicles.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {searchResults.vehicles.map(v => (
                      <div 
                        key={v.id}
                        onClick={() => { setSearchQuery(''); setActiveTab('vehicles'); }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 transition-colors cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{v.busNumber}</p>
                          <span className="text-[10px] text-slate-400 font-semibold leading-none">Reg: {v.registrationNumber} • Cap: {v.capacity}</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-750">{v.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Routes Results */}
              {searchResults.routes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <RouteIcon className="w-3.5 h-3.5" /> Routes ({searchResults.routes.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {searchResults.routes.map(r => (
                      <div 
                        key={r.id}
                        onClick={() => { setSearchQuery(''); setActiveTab('routes'); }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 transition-colors cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{r.routeNumber} - {r.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold leading-none">{r.distance} km • {r.stops.length} stops</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-700">{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers Results */}
              {searchResults.drivers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Drivers ({searchResults.drivers.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {searchResults.drivers.map(d => (
                      <div 
                        key={d.id}
                        onClick={() => { setSearchQuery(''); setActiveTab('drivers'); }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-300 transition-colors cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{d.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold leading-none">Phone: {d.phone} • Exp: {d.experience} yrs</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-700">{d.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    const views = [
      { id: 'dashboard', comp: <DashboardView setActiveTab={setActiveTab} onOpenScanBoarding={() => setIsScanBoardingOpen(true)} /> },
      { id: 'tracking', comp: <TrackingView /> },
      { id: 'routes', comp: <RoutesView onOpenAddRoute={() => setIsAddRouteOpen(true)} /> },
      { id: 'optimizer', comp: <RouteOptimizerView /> },
      { id: 'students', comp: <StudentsView onOpenScanBoarding={() => setIsScanBoardingOpen(true)} onOpenAddStudent={() => setIsAddStudentOpen(true)} onOpenEditStudent={(s) => { setEditingStudent(s); setIsEditStudentOpen(true); }} /> },
      { id: 'drivers', comp: <DriversView onOpenAddDriver={() => setIsAddDriverOpen(true)} onOpenEditDriver={(d) => { setEditingDriver(d); setIsEditDriverOpen(true); }} /> },
      { id: 'vehicles', comp: <VehiclesView onOpenAddVehicle={() => setIsAddVehicleOpen(true)} onOpenEditVehicle={(v) => { setEditingVehicle(v); setIsEditVehicleOpen(true); }} /> },
      { id: 'attendance', comp: <AttendanceView /> },
      { id: 'emergencies', comp: <EmergenciesView /> },
      { id: 'notifications', comp: <NotificationsView /> },
      { id: 'reports', comp: <ReportsView /> },
      { id: 'settings', comp: <SettingsView /> },
    ];

    return (
      <div className="w-full">
        {views.map(v => (
          activeTab === v.id ? (
            <div key={v.id} className="block">
              {v.comp}
            </div>
          ) : null
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddRoute={() => setIsAddRouteOpen(true)}
        onOpenAddVehicle={() => setIsAddVehicleOpen(true)}
        onOpenScanBoarding={() => setIsScanBoardingOpen(true)}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-h-[calc(100vh-4rem)]">
          {renderActiveView()}
        </main>
      </div>

      {/* Toast popup warnings notifications */}
      <ToastContainer />

      {/* Modals stack */}
      <AddRouteModal isOpen={isAddRouteOpen} onClose={() => setIsAddRouteOpen(false)} />
      <AddVehicleModal isOpen={isAddVehicleOpen} onClose={() => setIsAddVehicleOpen(false)} />
      <EditVehicleModal isOpen={isEditVehicleOpen} vehicle={editingVehicle} onClose={() => { setIsEditVehicleOpen(false); setEditingVehicle(null); }} />
      <AddStudentModal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} />
      <EditStudentModal isOpen={isEditStudentOpen} student={editingStudent} onClose={() => { setIsEditStudentOpen(false); setEditingStudent(null); }} />
      <AddDriverModal isOpen={isAddDriverOpen} onClose={() => setIsAddDriverOpen(false)} />
      <EditDriverModal isOpen={isEditDriverOpen} driver={editingDriver} onClose={() => { setIsEditDriverOpen(false); setEditingDriver(null); }} />
      <ScanBoardingModal isOpen={isScanBoardingOpen} onClose={() => setIsScanBoardingOpen(false)} />
      <EmergencyModal isOpen={isEmergencyOpen} onClose={() => setIsEmergencyOpen(false)} />

    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <DashboardContainer />
    </AppProvider>
  );
}
