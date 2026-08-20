"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAll, upsertRecord, deleteRecord, isSupabaseConfigured, supabase } from '@/lib/supabase';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  actualTime?: string;
  status: 'pending' | 'arrived' | 'passed';
  boardedCount: number;
}

export interface Route {
  id: string; // RT-001
  name: string;
  routeNumber: string;
  busId: string;
  driverId: string;
  stops: RouteStop[];
  studentsCount: number;
  distance: number; // in km
  duration: number; // in minutes
  status: 'scheduled' | 'running' | 'completed' | 'inactive';
  path: [number, number][]; // coordinates for map
  currentPathIndex: number; // current position index in path
  departureTime: string;
  expectedArrivalTime: string;
}

export interface Vehicle {
  id: string; // BUS-001
  busNumber: string;
  registrationNumber: string;
  model: string;
  capacity: number;
  currentStudents: number;
  driverId: string;
  routeId: string;
  gpsStatus: 'connected' | 'disconnected';
  gpsDeviceId: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  pollutionExpiry: string;
  maintenanceStatus: 'good' | 'expiring' | 'expired' | 'maintenance';
  status: 'active' | 'inactive' | 'maintenance' | 'emergency';
  currentSpeed: number; // km/h
  maxSpeedLimit: number; // km/h
}

export interface Driver {
  id: string; // DRV-001
  name: string;
  avatar: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  busId: string;
  routeId: string;
  experience: number; // years
  safetyStatus: 'safe' | 'warning' | 'suspended';
  ecoSafetyScore?: number; // Teltonika Green Driving Score 0-100
  status: 'available' | 'on route' | 'off duty' | 'suspended';
}

export interface GpsDevice {
  id: string; // GPS-DEV-001
  imei: string;
  deviceModel: string; // Teltonika FMC920
  protocol: string;
  simPhoneNumber: string;
  simCarrier: string;
  busId: string;
  status: 'active' | 'inactive' | 'maintenance' | 'unassigned';
  lastPingTime: string;
}


export interface Student {
  id: string; // STU-0001
  name: string;
  class: string;
  section: string;
  routeId: string;
  busId: string;
  pickupStop: string;
  boardingStatus: 'not boarded' | 'boarded' | 'dropped off' | 'absent';
  parentName: string;
  parentContact: string;
  emergencyContact: string;
  boardingTime?: string;
  dropTime?: string;
}

export interface EmergencyEvent {
  id: string; // EMG-001
  busId: string;
  routeId: string;
  location: { lat: number; lng: number };
  time: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  type: 'Accident' | 'Medical Emergency' | 'Vehicle Breakdown' | 'Route Deviation' | 'Overspeeding' | 'Student Safety' | 'GPS Offline';
  status: 'active' | 'acknowledged' | 'responding' | 'resolved';
  driverId: string;
  studentsOnboard: number;
  resolvedTime?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  time: string;
  busId?: string;
  routeId?: string;
  read: boolean;
}

export interface Activity {
  id: string;
  text: string;
  time: string;
  busId?: string;
  routeId?: string;
  type: 'boarding' | 'start' | 'delay' | 'emergency' | 'complete' | 'general';
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppSettings {
  schoolName: string;
  gpsSimulation: boolean;
  parentNotifications: boolean;
  delayAlerts: boolean;
  speedLimit: number;
  routeDeviationThreshold: number; // in meters
}

// ==========================================
// CONTEXT INTERFACE
// ==========================================

interface AppContextType {
  vehicles: Vehicle[];
  routes: Route[];
  students: Student[];
  drivers: Driver[];
  emergencies: EmergencyEvent[];
  notifications: Notification[];
  activities: Activity[];
  settings: AppSettings;
  simulationActive: boolean;
  
  gpsDevices: GpsDevice[];
  
  // Actions
  setSimulationActive: (active: boolean) => void;
  startRoute: (routeId: string) => void;
  stopRoute: (routeId: string) => void;
  addRoute: (route: any) => void;
  editRoute: (route: Route) => void;
  deleteRoute: (routeId: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'currentStudents' | 'currentSpeed'>) => void;
  editVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (vehicleId: string) => void;
  changeVehicleStatus: (vehicleId: string, status: Vehicle['status']) => void;
  assignDriver: (driverId: string, busId: string, routeId: string) => string | null;
  addDriver: (driver: Omit<Driver, 'id' | 'status'>) => void;
  editDriver: (driver: Driver) => void;
  deleteDriver: (driverId: string) => void;
  addStudent: (student: Omit<Student, 'id' | 'boardingStatus'>) => void;
  editStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  markStudentBoarding: (studentId: string, status: Student['boardingStatus']) => void;
  markChildAbsentToday: (studentId: string, reason?: string) => void;
  triggerEmergency: (event: Omit<EmergencyEvent, 'id' | 'time' | 'status' | 'driverId' | 'studentsOnboard'>) => void;
  acknowledgeEmergency: (id: string) => void;
  respondEmergency: (id: string) => void;
  resolveEmergency: (id: string) => void;
  assignReplacementBus: (emergencyId: string, replacementBusId: string) => void;
  sendNotification: (type: Notification['type'], message: string, busId?: string, routeId?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addActivity: (text: string, type: Activity['type'], busId?: string, routeId?: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetDemoData: () => void;
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ==========================================
// SEEDING HELPERS
// ==========================================

const BangaloreCenter = { lat: 12.9716, lng: 77.5946 };

// Simple routing generator to create path coordinates
const generatePath = (start: { lat: number, lng: number }, end: { lat: number, lng: number }, steps = 15): [number, number][] => {
  const path: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start.lat + (end.lat - start.lat) * ratio + Math.sin(ratio * Math.PI) * 0.005 * (i % 2 === 0 ? 1 : -1);
    const lng = start.lng + (end.lng - start.lng) * ratio + Math.cos(ratio * Math.PI) * 0.005 * (i % 3 === 0 ? 1 : -1);
    path.push([lat, lng]);
  }
  return path;
};

const defaultSettings: AppSettings = {
  schoolName: "Greenfield International School",
  gpsSimulation: true,
  parentNotifications: true,
  delayAlerts: true,
  speedLimit: 50,
  routeDeviationThreshold: 100,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [simulationActive, setSimulationActive] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [emergencies, setEmergies] = useState<EmergencyEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [gpsDevices, setGpsDevices] = useState<GpsDevice[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [initialized, setInitialized] = useState(false);


  // ─────────────────────────────────────────────────────────────────
  // Initialize: try Supabase first, fall back to localStorage / seed
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (isSupabaseConfigured()) {
        // ── Pull live data from Supabase ──────────────────────────
        const [dbDrivers, dbVehicles, dbRoutes, dbStudents,
               dbEmergencies, dbNotifications, dbActivities,
               dbGpsDevices] = await Promise.all([
          fetchAll<any>('drivers'),
          fetchAll<any>('vehicles'),
          fetchAll<any>('routes'),
          fetchAll<any>('students'),
          fetchAll<any>('emergencies'),
          fetchAll<any>('notifications'),
          fetchAll<any>('activities'),
          fetchAll<any>('gps_devices'),
        ]);

        if (dbDrivers.length || dbVehicles.length || dbStudents.length || dbRoutes.length) {
          // Map DB snake_case fields to app model camelCase
          if (dbDrivers.length) {
            setDrivers(dbDrivers.map((d: any) => ({
              id: d.id,
              name: d.name,
              avatar: d.avatar,
              phone: d.phone,
              licenseNumber: d.license_number || d.licenseNumber || '',
              licenseExpiry: d.license_expiry || d.licenseExpiry || '',
              busId: d.bus_id || d.busId || '',
              routeId: d.route_id || d.routeId || '',
              experience: d.experience || 0,
              safetyStatus: d.safety_status || d.safetyStatus || 'safe',
              ecoSafetyScore: d.eco_safety_score ?? d.ecoSafetyScore ?? 95,
              status: d.status || 'available'
            })));
          }

          if (dbVehicles.length) {
            setVehicles(dbVehicles.map((v: any) => ({
              id: v.id,
              busNumber: v.bus_number || v.busNumber || v.id,
              registrationNumber: v.registration_number || v.registrationNumber || '',
              model: v.model || '',
              capacity: v.capacity || 40,
              currentStudents: v.current_students ?? v.currentStudents ?? 0,
              driverId: v.driver_id || v.driverId || '',
              routeId: v.route_id || v.routeId || '',
              gpsStatus: v.gps_status || v.gpsStatus || 'connected',
              gpsDeviceId: v.gps_device_id || v.gpsDeviceId || '',
              insuranceExpiry: v.insurance_expiry || v.insuranceExpiry || '',
              fitnessExpiry: v.fitness_expiry || v.fitnessExpiry || '',
              pollutionExpiry: v.pollution_expiry || v.pollutionExpiry || '',
              maintenanceStatus: v.maintenance_status || v.maintenanceStatus || 'good',
              status: v.status || 'active',
              currentSpeed: v.current_speed ?? v.currentSpeed ?? 0,
              maxSpeedLimit: v.max_speed_limit ?? v.maxSpeedLimit ?? 50
            })));
          }

          if (dbRoutes.length) {
            setRoutes(dbRoutes.map((r: any) => ({
              id: r.id,
              name: r.name || '',
              routeNumber: r.route_number || r.routeNumber || r.id,
              busId: r.bus_id || r.busId || '',
              driverId: r.driver_id || r.driverId || '',
              stops: r.stops || [],
              studentsCount: r.students_count ?? r.studentsCount ?? 0,
              distance: r.distance || 0,
              duration: r.duration || 0,
              status: r.status || 'scheduled',
              path: r.path || [],
              currentPathIndex: r.current_path_index ?? r.currentPathIndex ?? 0,
              departureTime: r.departure_time || r.departureTime || '',
              expectedArrivalTime: r.expected_arrival_time || r.expectedArrivalTime || ''
            })));
          }

          if (dbStudents.length) {
            setStudents(dbStudents.map((s: any) => ({
              id: s.id,
              name: s.name,
              class: s.class,
              section: s.section,
              routeId: s.route_id || s.routeId || '',
              busId: s.bus_id || s.busId || '',
              pickupStop: s.pickup_stop || s.pickupStop || '',
              boardingStatus: s.boarding_status || s.boardingStatus || 'not boarded',
              parentName: s.parent_name || s.parentName || '',
              parentContact: s.parent_contact || s.parentContact || '',
              emergencyContact: s.emergency_contact || s.emergencyContact || '',
              boardingTime: s.boarding_time || s.boardingTime || undefined,
              dropTime: s.drop_time || s.dropTime || undefined
            })));
          }

          if (dbEmergencies.length)  setEmergies(dbEmergencies);
          if (dbNotifications.length) setNotifications(dbNotifications);
          if (dbActivities.length)   setActivities(dbActivities);

          if (dbGpsDevices.length) {
            setGpsDevices(dbGpsDevices.map((g: any) => ({
              id: g.id,
              imei: g.imei,
              deviceModel: g.device_model || g.deviceModel || 'Teltonika FMC920',
              protocol: g.protocol || 'teltonika_codec8',
              simPhoneNumber: g.sim_phone_number || g.simPhoneNumber || '',
              simCarrier: g.sim_carrier || g.simCarrier || '',
              busId: g.bus_id || g.busId || '',
              status: g.status || 'active',
              lastPingTime: g.last_ping_time || g.lastPingTime || ''
            })));
          } else {
            // Seed GPS devices from defaults since table is empty
            const defaultGps: GpsDevice[] = Array.from({ length: 35 }).map((_, idx) => ({
              id: `GPS-DEV-${String(idx + 1).padStart(3, '0')}`,
              imei: `356891002345${String(idx + 101).padStart(3, '0')}`,
              deviceModel: idx % 3 === 0 ? 'Teltonika FMC920' : 'Teltonika FMB920',
              protocol: 'teltonika_codec8',
              simPhoneNumber: `+91 98123 ${10000 + idx}`,
              simCarrier: 'Airtel M2M',
              busId: `BUS-${String(idx + 1).padStart(3, '0')}`,
              status: 'active' as const,
              lastPingTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setGpsDevices(defaultGps);
          }
          setInitialized(true);
          return;
        }
        // DB is empty — fall through to localStorage / seed
      }

      // ── localStorage fallback ─────────────────────────────────
      const savedVehicles = localStorage.getItem('sct_vehicles');
      const savedRoutes = localStorage.getItem('sct_routes');
      const savedStudents = localStorage.getItem('sct_students');
      const savedDrivers = localStorage.getItem('sct_drivers');
      const savedEmergencies = localStorage.getItem('sct_emergencies');
      const savedNotifications = localStorage.getItem('sct_notifications');
      const savedActivities = localStorage.getItem('sct_activities');
      const savedSettings = localStorage.getItem('sct_settings');
      const savedGpsDevices = localStorage.getItem('sct_gps_devices');

      if (savedVehicles && savedRoutes && savedStudents && savedDrivers) {
        setVehicles(JSON.parse(savedVehicles));
        setRoutes(JSON.parse(savedRoutes));
        setStudents(JSON.parse(savedStudents));
        setDrivers(JSON.parse(savedDrivers));
        setEmergies(savedEmergencies ? JSON.parse(savedEmergencies) : []);
        setNotifications(savedNotifications ? JSON.parse(savedNotifications) : []);
        setActivities(savedActivities ? JSON.parse(savedActivities) : []);
        setSettings(savedSettings ? JSON.parse(savedSettings) : defaultSettings);
        if (savedGpsDevices) {
          setGpsDevices(JSON.parse(savedGpsDevices));
        } else {
          const defaultGps: GpsDevice[] = Array.from({ length: 35 }).map((_, idx) => ({
            id: `GPS-DEV-${String(idx + 1).padStart(3, '0')}`,
            imei: `356891002345${String(idx + 101).padStart(3, '0')}`,
            deviceModel: idx % 3 === 0 ? 'Teltonika FMC920' : 'Teltonika FMB920',
            protocol: 'teltonika_codec8',
            simPhoneNumber: `+91 98123 ${10000 + idx}`,
            simCarrier: 'Airtel M2M',
            busId: `BUS-${String(idx + 1).padStart(3, '0')}`,
            status: 'active' as const,
            lastPingTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setGpsDevices(defaultGps);
        }
      } else {
        seedData();
      }
      setInitialized(true);
    };

    init();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Persist: localStorage (always) + debounced Supabase sync (when connected)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;

    // ── 1. Always write to localStorage (instant offline fallback) ───────
    localStorage.setItem('sct_vehicles',      JSON.stringify(vehicles));
    localStorage.setItem('sct_routes',        JSON.stringify(routes));
    localStorage.setItem('sct_students',      JSON.stringify(students));
    localStorage.setItem('sct_drivers',       JSON.stringify(drivers));
    localStorage.setItem('sct_emergencies',   JSON.stringify(emergencies));
    localStorage.setItem('sct_notifications', JSON.stringify(notifications));
    localStorage.setItem('sct_activities',    JSON.stringify(activities));
    localStorage.setItem('sct_settings',      JSON.stringify(settings));
    localStorage.setItem('sct_gps_devices',   JSON.stringify(gpsDevices));

    // ── 2. Debounced Supabase sync — waits 3 s after last change ─────────
    if (!isSupabaseConfigured()) return;

    const timer = setTimeout(() => {
      // camelCase → snake_case mappers matching supabase_schema.sql exactly
      const toDbVehicle = (v: Vehicle) => ({
        id: v.id,
        bus_number:           v.busNumber,
        registration_number:  v.registrationNumber,
        model:                v.model,
        capacity:             v.capacity,
        current_students:     v.currentStudents,
        driver_id:            v.driverId || null,
        route_id:             v.routeId  || null,
        gps_status:           v.gpsStatus,
        gps_device_id:        v.gpsDeviceId || null,
        insurance_expiry:     v.insuranceExpiry,
        fitness_expiry:       v.fitnessExpiry,
        pollution_expiry:     v.pollutionExpiry,
        maintenance_status:   v.maintenanceStatus,
        status:               v.status,
        current_speed:        v.currentSpeed,
        max_speed_limit:      v.maxSpeedLimit,
      });

      const toDbDriver = (d: Driver) => ({
        id: d.id,
        name:              d.name,
        avatar:            d.avatar,
        phone:             d.phone,
        license_number:    d.licenseNumber,
        license_expiry:    d.licenseExpiry,
        bus_id:            d.busId   || null,
        route_id:          d.routeId || null,
        experience:        d.experience,
        safety_status:     d.safetyStatus,
        eco_safety_score:  d.ecoSafetyScore ?? 95,
        status:            d.status,
      });

      const toDbStudent = (s: Student) => ({
        id: s.id,
        name:              s.name,
        class:             s.class,
        section:           s.section,
        route_id:          s.routeId || null,
        bus_id:            s.busId   || null,
        pickup_stop:       s.pickupStop,
        boarding_status:   s.boardingStatus,
        parent_name:       s.parentName,
        parent_contact:    s.parentContact,
        emergency_contact: s.emergencyContact,
        boarding_time:     s.boardingTime ?? null,
        drop_time:         s.dropTime    ?? null,
      });

      const toDbRoute = (r: Route) => ({
        id: r.id,
        name:                   r.name,
        route_number:           r.routeNumber,
        bus_id:                 r.busId    || null,
        driver_id:              r.driverId || null,
        students_count:         r.studentsCount,
        distance:               r.distance,
        duration:               r.duration,
        status:                 r.status,
        path:                   r.path,
        current_path_index:     r.currentPathIndex,
        departure_time:         r.departureTime,
        expected_arrival_time:  r.expectedArrivalTime,
      });

      const toDbGps = (g: GpsDevice) => ({
        id:               g.id,
        imei:             g.imei,
        device_model:     g.deviceModel,
        protocol:         g.protocol,
        sim_phone_number: g.simPhoneNumber,
        sim_carrier:      g.simCarrier,
        bus_id:           g.busId || null,
        status:           g.status,
        last_ping_time:   g.lastPingTime,
      });

      // camelCase → snake_case mapper for emergencies
      const toDbEmergency = (e: EmergencyEvent) => ({
        id:               e.id,
        bus_id:           e.busId    || null,
        route_id:         e.routeId  || null,
        location_lat:     e.location.lat,
        location_lng:     e.location.lng,
        time:             e.time,
        severity:         e.severity,
        description:      e.description,
        type:             e.type,
        status:           e.status,
        driver_id:        e.driverId || null,
        students_onboard: e.studentsOnboard,
        resolved_time:    e.resolvedTime ?? null,
      });

      // camelCase → snake_case mapper for notifications
      const toDbNotification = (n: Notification) => ({
        id:       n.id,
        type:     n.type,
        message:  n.message,
        time:     n.time,
        bus_id:   n.busId   || null,
        route_id: n.routeId || null,
        read:     n.read,
      });

      // camelCase → snake_case mapper for activities
      const toDbActivity = (a: Activity) => ({
        id:       a.id,
        text:     a.text,
        time:     a.time,
        bus_id:   a.busId   || null,
        route_id: a.routeId || null,
        type:     a.type,
      });

      // Fire bulk upserts in parallel — includes emergencies, notifications, activities
      Promise.all([
        ...vehicles.map(v      => upsertRecord('vehicles',     toDbVehicle(v))),
        ...drivers.map(d       => upsertRecord('drivers',      toDbDriver(d))),
        ...students.map(s      => upsertRecord('students',     toDbStudent(s))),
        ...routes.map(r        => upsertRecord('routes',       toDbRoute(r))),
        ...gpsDevices.map(g    => upsertRecord('gps_devices',  toDbGps(g))),
        ...emergencies.map(e   => upsertRecord('emergencies',  toDbEmergency(e))),
        ...notifications.map(n => upsertRecord('notifications',toDbNotification(n))),
        ...activities.map(a    => upsertRecord('activities',   toDbActivity(a))),
      ]).catch(() => {/* errors already logged inside upsertRecord */});
    }, 3000); // 3-second debounce

    return () => clearTimeout(timer);
  }, [vehicles, routes, students, drivers, emergencies, notifications, activities, settings, gpsDevices, initialized]);


  const seedData = () => {
    // 1. Generate Drivers (26 drivers)
    const indianNames = [
      "Amit Sharma", "Rakesh Verma", "Sanjay Kumar", "Vijay Singh", "Rajesh Patel",
      "Anil Gupta", "Sunil Dutt", "Ramesh Chawla", "Manoj Tiwari", "Vikram Rathore",
      "Karan Johar", "Arjun Reddy", "Pradeep Yadav", "Dinesh Karthik", "Suresh Raina",
      "Rahul Dravid", "Ashish Nehra", "Harbhajan Singh", "Mohit Sharma", "Yuvraj Singh",
      "Ajinkya Rahane", "Cheteshwar Pujara", "Jasprit Bumrah", "Hardik Pandya", "Krunal Pandya",
      "Ishant Sharma"
    ];

    const seededDrivers: Driver[] = indianNames.map((name, index) => {
      const id = `DRV-${String(index + 1).padStart(3, '0')}`;
      return {
        id,
        name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        phone: `+91 98765 ${50000 + index}`,
        licenseNumber: `DL-${10000 + index}/KA03`,
        licenseExpiry: `2029-12-${String((index % 28) + 1).padStart(2, '0')}`,
        busId: index < 22 ? `BUS-${String(index + 1).padStart(3, '0')}` : '',
        routeId: index < 22 ? `RT-${String(index + 1).padStart(3, '0')}` : '',
        experience: 5 + (index % 15),
        safetyStatus: index === 2 ? 'warning' : 'safe',
        ecoSafetyScore: 88 + (index * 3) % 12,
        status: index < 22 ? 'on route' : 'available',
      };
    });

    // Generate Teltonika FMC920 Hardware GPS Devices
    const seededGpsDevices: GpsDevice[] = Array.from({ length: 35 }).map((_, idx) => ({
      id: `GPS-DEV-${String(idx + 1).padStart(3, '0')}`,
      imei: `356891002345${String(idx + 101).padStart(3, '0')}`,
      deviceModel: idx % 3 === 0 ? "Teltonika FMC920" : "Teltonika FMB920",
      protocol: "teltonika_codec8",
      simPhoneNumber: `+91 98123 ${10000 + idx}`,
      simCarrier: "Airtel M2M",
      busId: `BUS-${String(idx + 1).padStart(3, '0')}`,
      status: "active",
      lastPingTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    setGpsDevices(seededGpsDevices);



    // 2. Generate Vehicles (35 vehicles: 28 active, 4 maintenance, 3 inactive)
    const seededVehicles: Vehicle[] = [];
    for (let i = 1; i <= 35; i++) {
      const id = `BUS-${String(i).padStart(3, '0')}`;
      const busNumber = `BUS ${String(i).padStart(2, '0')}`;
      let status: Vehicle['status'] = 'active';
      let maintenanceStatus: Vehicle['maintenanceStatus'] = 'good';
      
      if (i > 28 && i <= 32) {
        status = 'maintenance';
        maintenanceStatus = 'maintenance';
      } else if (i > 32) {
        status = 'inactive';
        maintenanceStatus = 'good';
      }
      
      if (i === 12) {
        status = 'emergency'; // BUS 12 starts in emergency breakdown
      }
      if (i === 3) {
        maintenanceStatus = 'expiring';
      }
      if (i === 15) {
        maintenanceStatus = 'expired';
      }

      seededVehicles.push({
        id,
        busNumber,
        registrationNumber: `KA-03-EQ-${2000 + i}`,
        model: i % 2 === 0 ? "Tata Starbus 40S" : "Ashok Leyland Lynx",
        capacity: 40,
        currentStudents: 0, // Will be computed
        driverId: i <= 22 ? `DRV-${String(i).padStart(3, '0')}` : '',
        routeId: i <= 22 ? `RT-${String(i).padStart(3, '0')}` : '',
        gpsStatus: i === 18 ? 'disconnected' : 'connected',
        gpsDeviceId: `GPS-AIS-${10000 + i}`,
        insuranceExpiry: `2027-04-${String((i % 28) + 1).padStart(2, '0')}`,
        fitnessExpiry: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
        pollutionExpiry: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
        maintenanceStatus,
        status,
        currentSpeed: status === 'active' && i <= 18 ? 32 + (i % 15) : 0,
        maxSpeedLimit: 50
      });
    }

    // 3. Generate Routes (22 routes: 18 active, 4 scheduled)
    const schoolLocations = [
      { name: "Greenfield International School", lat: 12.9716, lng: 77.5946 },
      { name: "Hill Side School", lat: 12.9912, lng: 77.5721 },
      { name: "Sunrise Public School", lat: 12.9515, lng: 77.6251 },
      { name: "Lake View College", lat: 12.9325, lng: 77.5482 },
      { name: "St. Mary School", lat: 12.9810, lng: 77.6432 },
    ];

    const stopNames = [
      "Indiranagar Circle", "Koramangala 5th Block", "HSR Layout BDA Complex", "Whitefield Metro Stn",
      "Jayanagar 4th Block", "Malleshwaram 8th Cross", "Hebbal Flyover Junction", "MG Road Metro",
      "Bannerghatta Road Apex", "Basavanagudi Temple St", "Richmond Road Plaza", "Frazer Town Mosque",
      "Ulsoor Lake Gate", "RT Nagar Main Stop", "Rajajinagar Bridge", "BTM Layout Water Tank",
      "Domlur Flyover", "Bellandur Outer Ring Road", "Sarjapur Fire Station", "Vasanth Nagar Park"
    ];

    const seededRoutes: Route[] = [];
    for (let i = 1; i <= 22; i++) {
      const id = `RT-${String(i).padStart(3, '0')}`;
      const routeNumber = `Route ${i}`;
      const school = schoolLocations[(i - 1) % schoolLocations.length];
      
      // Determine destination/stops
      const stopsCount = 5 + (i % 4);
      const stops: RouteStop[] = [];
      
      // Starting point: outward radial from school
      const angle = (i * 2 * Math.PI) / 22;
      const radius = 0.08; // approx 8-9 km radial
      const endPoint = {
        lat: school.lat + Math.sin(angle) * radius,
        lng: school.lng + Math.cos(angle) * radius
      };

      const path = generatePath(school, endPoint, 30);

      // Generate Stops along the path
      for (let j = 0; j < stopsCount; j++) {
        const pathIndex = Math.floor((j / (stopsCount - 1)) * (path.length - 1));
        const stopCoords = path[pathIndex];
        const hour = 7;
        const minutes = 30 + Math.floor((j / stopsCount) * 45);
        stops.push({
          name: stopNames[(i + j) % stopNames.length] + ` Stop ${j+1}`,
          lat: stopCoords[0],
          lng: stopCoords[1],
          scheduledTime: `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} AM`,
          status: 'pending',
          boardedCount: 0
        });
      }

      const status = i <= 18 ? 'running' : 'scheduled';
      
      seededRoutes.push({
        id,
        name: `${school.name.split(' ')[0]} ↔ Zone ${String.fromCharCode(65 + (i % 6))}`,
        routeNumber,
        busId: `BUS-${String(i).padStart(3, '0')}`,
        driverId: `DRV-${String(i).padStart(3, '0')}`,
        stops,
        studentsCount: 20 + (i % 15), // Filled below
        distance: 12 + (i % 10),
        duration: 35 + (i % 20),
        status,
        path,
        currentPathIndex: status === 'running' ? Math.floor(path.length * 0.4) : 0,
        departureTime: "07:30 AM",
        expectedArrivalTime: "08:30 AM"
      });
    }

    // 4. Generate Students (600 students)
    // Distributed among the 22 routes
    const firstNames = [
      "Aarav", "Aanya", "Vihaan", "Aditi", "Sai", "Ananya", "Krishna", "Prisha",
      "Ishaan", "Diya", "Kabir", "Meera", "Rohan", "Saanvi", "Arjun", "Kavya",
      "Dev", "Riya", "Atharv", "Avani", "Reyansh", "Anika", "Shaurya", "Zara",
      "Aaryan", "Ira", "Kian", "Ridhi", "Dhruv", "Myra", "Siddharth", "Aisha"
    ];
    const lastNames = [
      "Sharma", "Verma", "Kumar", "Singh", "Patel", "Gupta", "Nair", "Iyer",
      "Reddy", "Rao", "Joshi", "Mehta", "Das", "Choudhury", "Pillai", "Bose",
      "Sen", "Roy", "Deshmukh", "Kulkarni", "Prasad", "Mishra", "Pandey", "Dubey"
    ];

    const seededStudents: Student[] = [];
    let studentCounter = 1;
    let totalBoarded = 0;

    // Distribute students to routes
    seededRoutes.forEach((route) => {
      const routeBus = seededVehicles.find(v => v.id === route.busId);
      const isRouteRunning = route.status === 'running';
      
      // Generate students for this route
      const numStudents = route.studentsCount;
      let routeBoarded = 0;

      for (let s = 0; s < numStudents; s++) {
        const studentId = `STU-${String(studentCounter).padStart(4, '0')}`;
        const fName = firstNames[(studentCounter * 3) % firstNames.length];
        const lName = lastNames[(studentCounter * 7) % lastNames.length];
        const name = `${fName} ${lName}`;
        
        // Stops selection
        const stopIndex = s % route.stops.length;
        const pickupStop = route.stops[stopIndex].name;
        
        // Determine boarding status
        // We need exactly 512 boarded students across all routes.
        // There are 18 running routes. Total students on running routes is around 18 * 27 = ~486, or let's adjust:
        // We will mark students boarded if the route is running, up to 512 total.
        let boardingStatus: Student['boardingStatus'] = 'not boarded';
        
        if (isRouteRunning) {
          // If totalBoarded is less than 512, make most students 'boarded', some 'absent', some 'dropped off'
          if (totalBoarded < 512) {
            const roll = (studentCounter % 10);
            if (roll < 8) {
              boardingStatus = 'boarded';
              totalBoarded++;
              routeBoarded++;
            } else if (roll === 8) {
              boardingStatus = 'dropped off';
              routeBoarded++; // dropped off means they were on it
            } else {
              boardingStatus = 'absent';
            }
          }
        } else {
          // Scheduled/inactive routes have 'not boarded'
          boardingStatus = 'not boarded';
        }

        seededStudents.push({
          id: studentId,
          name,
          class: `${1 + (studentCounter % 10)}`,
          section: String.fromCharCode(65 + (studentCounter % 3)),
          routeId: route.id,
          busId: route.busId,
          pickupStop,
          boardingStatus,
          parentName: `Mr. & Mrs. ${lName}`,
          parentContact: `+91 99887 ${70000 + studentCounter}`,
          emergencyContact: `+91 91111 ${10000 + studentCounter}`,
          boardingTime: boardingStatus === 'boarded' || boardingStatus === 'dropped off' ? '08:12 AM' : undefined,
          dropTime: boardingStatus === 'dropped off' ? '08:35 AM' : undefined
        });

        studentCounter++;
      }

      // Update bus current students count
      if (routeBus) {
        routeBus.currentStudents = routeBoarded;
      }
    });

    // Make sure we have exactly 512 boarded students to hit the requirement
    let currentBoarded = seededStudents.filter(s => s.boardingStatus === 'boarded').length;
    if (currentBoarded < 512) {
      // Toggle some 'not boarded' students of running routes to boarded
      for (const s of seededStudents) {
        const r = seededRoutes.find(route => route.id === s.routeId);
        if (r && r.status === 'running' && s.boardingStatus === 'not boarded') {
          s.boardingStatus = 'boarded';
          s.boardingTime = '08:15 AM';
          currentBoarded++;
          
          const bus = seededVehicles.find(v => v.id === s.busId);
          if (bus) bus.currentStudents++;

          if (currentBoarded === 512) break;
        }
      }
    }

    // 5. Seed 3 Active Emergency Events to hit the dashboard requirement "Alerts: 3"
    const seededEmergencies: EmergencyEvent[] = [
      {
        id: "EMG-001",
        busId: "BUS-012", // BUS 12 is set to emergency breakdown
        routeId: "RT-012",
        location: { lat: 12.9815, lng: 77.5842 },
        time: "08:05 AM",
        severity: "critical",
        type: "Vehicle Breakdown",
        description: "Engine overheating. Smoke reported from the bonnet on MG Road.",
        status: "active",
        driverId: "DRV-012",
        studentsOnboard: seededStudents.filter(s => s.busId === "BUS-012" && s.boardingStatus === 'boarded').length
      },
      {
        id: "EMG-002",
        busId: "BUS-003",
        routeId: "RT-003",
        location: { lat: 12.9515, lng: 77.6251 },
        time: "08:10 AM",
        severity: "high",
        type: "Overspeeding",
        description: "Vehicle exceeded school safety limit of 50 km/h (Recorded: 72 km/h on flyover).",
        status: "active",
        driverId: "DRV-003",
        studentsOnboard: seededStudents.filter(s => s.busId === "BUS-003" && s.boardingStatus === 'boarded').length
      },
      {
        id: "EMG-003",
        busId: "BUS-018",
        routeId: "RT-018",
        location: { lat: 12.9325, lng: 77.5482 },
        time: "07:55 AM",
        severity: "medium",
        type: "GPS Offline",
        description: "GPS transponder unit has lost cellular connectivity. Last ping 15 minutes ago.",
        status: "active",
        driverId: "DRV-018",
        studentsOnboard: seededStudents.filter(s => s.busId === "BUS-018" && s.boardingStatus === 'boarded').length
      }
    ];

    // Seed Notifications (Notifications matching the above)
    const seededNotifications: Notification[] = [
      {
        id: "NTF-001",
        type: "error",
        message: "CRITICAL: BUS 12 reported a Vehicle Breakdown on Route 12.",
        time: "08:05 AM",
        busId: "BUS-012",
        routeId: "RT-012",
        read: false
      },
      {
        id: "NTF-002",
        type: "warning",
        message: "Overspeeding: BUS 03 detected running at 72 km/h (Limit: 50 km/h).",
        time: "08:10 AM",
        busId: "BUS-003",
        routeId: "RT-003",
        read: false
      },
      {
        id: "NTF-003",
        type: "warning",
        message: "GPS Signal Lost: BUS 18 GPS has gone offline.",
        time: "07:55 AM",
        busId: "BUS-018",
        routeId: "RT-018",
        read: true
      },
      {
        id: "NTF-004",
        type: "success",
        message: "Route 7 started running successfully.",
        time: "07:30 AM",
        busId: "BUS-007",
        routeId: "RT-007",
        read: true
      }
    ];

    const seededActivities: Activity[] = [
      {
        id: "ACT-001",
        text: "BUS 07 started running on Greenfield School radial route.",
        time: "07:30 AM",
        busId: "BUS-007",
        routeId: "RT-007",
        type: "start"
      },
      {
        id: "ACT-002",
        text: "GPS Offline alert triggered for BUS 18.",
        time: "07:55 AM",
        busId: "BUS-018",
        routeId: "RT-018",
        type: "emergency"
      },
      {
        id: "ACT-003",
        text: "Emergency Vehicle Breakdown reported by BUS 12.",
        time: "08:05 AM",
        busId: "BUS-012",
        routeId: "RT-012",
        type: "emergency"
      },
      {
        id: "ACT-004",
        text: "Overspeeding alert logged for BUS 03 (72 km/h).",
        time: "08:10 AM",
        busId: "BUS-003",
        routeId: "RT-003",
        type: "emergency"
      },
      {
        id: "ACT-005",
        text: "15 students boarded BUS 07 at Indiranagar Circle Stop 1.",
        time: "08:12 AM",
        busId: "BUS-007",
        routeId: "RT-007",
        type: "boarding"
      }
    ];

    setDrivers(seededDrivers);
    setVehicles(seededVehicles);
    setRoutes(seededRoutes);
    setStudents(seededStudents);
    setEmergies(seededEmergencies);
    setNotifications(seededNotifications);
    setActivities(seededActivities);
    setSettings(defaultSettings);
  };

  // ==========================================
  // ACTIONS IMPLEMENTATION
  // ==========================================

  const startRoute = (routeId: string) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'running' } : r));
    const route = routes.find(r => r.id === routeId);
    if (route) {
      addActivity(`Route ${route.routeNumber} has started.`, 'start', route.busId, route.id);
      sendNotification('info', `Route ${route.routeNumber} (${route.name}) has started.`, route.busId, route.id);
      
      // Update associated vehicle speed and status
      setVehicles(prev => prev.map(v => v.id === route.busId ? { ...v, status: 'active', currentSpeed: 35 } : v));
    }
  };

  const stopRoute = (routeId: string) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'completed' } : r));
    const route = routes.find(r => r.id === routeId);
    if (route) {
      addActivity(`Route ${route.routeNumber} completed successfully.`, 'complete', route.busId, route.id);
      sendNotification('success', `Route ${route.routeNumber} successfully completed its run.`, route.busId, route.id);
      
      // Update vehicle speed and students to dropped off
      setVehicles(prev => prev.map(v => v.id === route.busId ? { ...v, currentSpeed: 0, currentStudents: 0 } : v));
      setStudents(prev => prev.map(s => s.routeId === routeId && s.boardingStatus === 'boarded' ? { ...s, boardingStatus: 'dropped off', dropTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : s));
    }
  };

  const addRoute = (newRoute: any) => {
    const nextId = `RT-${String(routes.length + 1).padStart(3, '0')}`;
    
    // Generate simple linear path from first stop to last stop (or school center) if no custom path is provided
    const schoolCenter = BangaloreCenter;
    const startStop = newRoute.stops[0] || schoolCenter;
    const path = newRoute.path || generatePath(schoolCenter, startStop, 25);
    
    const stops: RouteStop[] = newRoute.stops.map((st: Omit<RouteStop, 'status' | 'boardedCount'>) => ({
      ...st,
      status: 'pending' as const,
      boardedCount: 0
    }));

    const route: Route = {
      ...newRoute,
      id: nextId,
      stops,
      path,
      currentPathIndex: 0,
      status: 'scheduled',
      studentsCount: 0
    };

    setRoutes(prev => [...prev, route]);
    addActivity(`New route ${route.routeNumber} created.`, 'general', route.busId, route.id);
    sendNotification('success', `Route ${route.routeNumber} has been added.`, route.busId, route.id);

    // Update vehicle to bind route
    if (newRoute.busId) {
      setVehicles(prev => prev.map(v => v.id === newRoute.busId ? { ...v, routeId: nextId } : v));
    }
    // Update driver to bind route
    if (newRoute.driverId) {
      setDrivers(prev => prev.map(d => d.id === newRoute.driverId ? { ...d, routeId: nextId } : d));
    }
  };

  const editRoute = (updatedRoute: Route) => {
    setRoutes(prev => prev.map(r => r.id === updatedRoute.id ? updatedRoute : r));
    addActivity(`Route ${updatedRoute.routeNumber} details updated.`, 'general', updatedRoute.busId, updatedRoute.id);
  };

  const deleteRoute = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    addActivity(`Route ${route.routeNumber} has been deleted.`, 'general');
    
    // Unbind vehicle and driver
    setVehicles(prev => prev.map(v => v.routeId === routeId ? { ...v, routeId: '' } : v));
    setDrivers(prev => prev.map(d => d.routeId === routeId ? { ...d, routeId: '' } : d));
  };

  const addVehicle = (newVehicle: Omit<Vehicle, 'id' | 'currentStudents' | 'currentSpeed'>) => {
    const nextId = `BUS-${String(vehicles.length + 1).padStart(3, '0')}`;
    const vehicle: Vehicle = {
      ...newVehicle,
      id: nextId,
      currentStudents: 0,
      currentSpeed: 0
    };

    setVehicles(prev => [...prev, vehicle]);
    addActivity(`New vehicle ${vehicle.busNumber} added.`, 'general', nextId);
    sendNotification('success', `Vehicle ${vehicle.busNumber} (${vehicle.registrationNumber}) added to fleet.`, nextId);
  };

  const editVehicle = (updatedVehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
    addActivity(`Vehicle ${updatedVehicle.busNumber} details updated.`, 'general', updatedVehicle.id);
  };

  const deleteVehicle = (vehicleId: string) => {
    const v = vehicles.find(veh => veh.id === vehicleId);
    setVehicles(prev => prev.filter(veh => veh.id !== vehicleId));
    addActivity(`Vehicle ${v?.busNumber || vehicleId} removed from fleet.`, 'general');
    setDrivers(prev => prev.map(d => d.busId === vehicleId ? { ...d, busId: '', status: 'available' } : d));
    setRoutes(prev => prev.map(r => r.busId === vehicleId ? { ...r, busId: '' } : r));
  };

  const changeVehicleStatus = (vehicleId: string, status: Vehicle['status']) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status } : v));
  };

  const addStudent = (newStudent: Omit<Student, 'id' | 'boardingStatus'>) => {
    const nextId = `STU-${String(students.length + 1).padStart(4, '0')}`;
    const student: Student = {
      ...newStudent,
      id: nextId,
      boardingStatus: 'not boarded'
    };
    setStudents(prev => [student, ...prev]);
    addActivity(`Student ${student.name} enrolled.`, 'general', student.busId, student.routeId);
    sendNotification('success', `Student ${student.name} enrolled in Class ${student.class}-${student.section}.`);
  };

  const editStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    addActivity(`Student ${updatedStudent.name} records updated.`, 'general');
  };

  const deleteStudent = (studentId: string) => {
    const s = students.find(stu => stu.id === studentId);
    setStudents(prev => prev.filter(stu => stu.id !== studentId));
    addActivity(`Student ${s?.name || studentId} record removed.`, 'general');
  };

  const deleteDriver = (driverId: string) => {
    const d = drivers.find(drv => drv.id === driverId);
    setDrivers(prev => prev.filter(drv => drv.id !== driverId));
    addActivity(`Driver ${d?.name || driverId} offboarded.`, 'general');
    setVehicles(prev => prev.map(v => v.driverId === driverId ? { ...v, driverId: '' } : v));
    setRoutes(prev => prev.map(r => r.driverId === driverId ? { ...r, driverId: '' } : r));
  };

  const markChildAbsentToday = (studentId: string, reason?: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, boardingStatus: 'absent' } : s));

    setVehicles(prev => prev.map(v => {
      if (v.id === student.busId) {
        const activeOnboard = students.filter(s => s.busId === v.id && s.id !== studentId && s.boardingStatus === 'boarded').length;
        return { ...v, currentStudents: activeOnboard };
      }
      return v;
    }));

    addActivity(`Parent marked ${student.name} ABSENT today.`, 'general', student.busId, student.routeId);
    sendNotification('info', `NOTICE: ${student.name} (Stop: ${student.pickupStop}) marked ABSENT today.`, student.busId, student.routeId);
  };


  const assignDriver = (driverId: string, busId: string, routeId: string): string | null => {
    // Check if driver is already assigned to a running route
    const currentDriver = drivers.find(d => d.id === driverId);
    if (currentDriver && currentDriver.status === 'on route' && currentDriver.busId !== busId) {
      return `Driver ${currentDriver.name} is currently on an active route. Please verify.`;
    }

    // Perform assignments
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        return { ...d, busId, routeId, status: busId ? 'on route' : 'available' };
      }
      // If other driver had this bus/route, release them
      if (d.busId === busId || (routeId && d.routeId === routeId)) {
        return { ...d, busId: '', routeId: '', status: 'available' };
      }
      return d;
    }));

    setVehicles(prev => prev.map(v => {
      if (v.id === busId) {
        return { ...v, driverId, routeId };
      }
      if (v.driverId === driverId) {
        return { ...v, driverId: '' };
      }
      return v;
    }));

    if (routeId) {
      setRoutes(prev => prev.map(r => {
        if (r.id === routeId) {
          return { ...r, driverId, busId };
        }
        if (r.driverId === driverId) {
          return { ...r, driverId: '' };
        }
        return r;
      }));
    }

    const bus = vehicles.find(v => v.id === busId);
    addActivity(`Driver assigned to ${bus?.busNumber || 'bus'}.`, 'general', busId, routeId);
    return null;
  };

  const addDriver = (newDriver: Omit<Driver, 'id' | 'status'>) => {
    const nextId = `DRV-${String(drivers.length + 1).padStart(3, '0')}`;
    const driver: Driver = {
      ...newDriver,
      id: nextId,
      status: newDriver.busId ? 'on route' : 'available'
    };

    setDrivers(prev => [...prev, driver]);
    addActivity(`New driver ${driver.name} onboarded.`, 'general');
    sendNotification('success', `Driver ${driver.name} has been added successfully.`, driver.busId, driver.routeId);
  };

  const editDriver = (updatedDriver: Driver) => {
    setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
    addActivity(`Driver ${updatedDriver.name} details updated.`, 'general');
  };

  const markStudentBoarding = (studentId: string, status: Student['boardingStatus']) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const oldStatus = s.boardingStatus;
        const studentName = s.name;
        const busNum = vehicles.find(v => v.id === s.busId)?.busNumber || "bus";
        
        let newBoardingTime = s.boardingTime;
        let newDropTime = s.dropTime;
        
        if (status === 'boarded') {
          newBoardingTime = timeStr;
          if (oldStatus !== 'boarded') {
            addActivity(`${studentName} boarded ${busNum} at ${s.pickupStop}.`, 'boarding', s.busId, s.routeId);
            sendNotification('info', `${studentName} has boarded ${busNum} safely.`, s.busId, s.routeId);
          }
        } else if (status === 'dropped off') {
          newDropTime = timeStr;
          if (oldStatus !== 'dropped off') {
            addActivity(`${studentName} dropped off safely at destination.`, 'boarding', s.busId, s.routeId);
            sendNotification('info', `${studentName} has been dropped off safely.`, s.busId, s.routeId);
          }
        } else if (status === 'absent') {
          newBoardingTime = undefined;
          newDropTime = undefined;
        }

        return {
          ...s,
          boardingStatus: status,
          boardingTime: newBoardingTime,
          dropTime: newDropTime
        };
      }
      return s;
    }));

    // Dynamic counts updates
    const student = students.find(s => s.id === studentId);
    if (student) {
      setVehicles(prev => prev.map(v => {
        if (v.id === student.busId) {
          // Recalculate students onboard for this bus
          const onboardCount = students.filter(s => s.busId === v.id && (s.id === studentId ? status === 'boarded' : s.boardingStatus === 'boarded')).length;
          return { ...v, currentStudents: onboardCount };
        }
        return v;
      }));
    }
  };

  const triggerEmergency = (event: Omit<EmergencyEvent, 'id' | 'time' | 'status' | 'driverId' | 'studentsOnboard'>) => {
    const nextId = `EMG-${String(emergencies.length + 1).padStart(3, '0')}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const route = routes.find(r => r.id === event.routeId);
    const bus = vehicles.find(v => v.id === event.busId);
    const driverId = route?.driverId || bus?.driverId || '';
    
    // Students currently onboard this bus
    const studentsOnboard = students.filter(s => s.busId === event.busId && s.boardingStatus === 'boarded').length;

    const newEvent: EmergencyEvent = {
      ...event,
      id: nextId,
      time: timeStr,
      status: 'active',
      driverId,
      studentsOnboard
    };

    setEmergies(prev => [newEvent, ...prev]);
    
    // ── Immediately persist SOS alert to Supabase ─────────────────────────
    if (isSupabaseConfigured()) {
      upsertRecord('emergencies', {
        id:               newEvent.id,
        bus_id:           newEvent.busId    || null,
        route_id:         newEvent.routeId  || null,
        location_lat:     newEvent.location.lat,
        location_lng:     newEvent.location.lng,
        time:             newEvent.time,
        severity:         newEvent.severity,
        description:      newEvent.description,
        type:             newEvent.type,
        status:           newEvent.status,
        driver_id:        newEvent.driverId || null,
        students_onboard: newEvent.studentsOnboard,
        resolved_time:    null,
      }).catch(() => {});
    }

    // Update vehicle status to emergency in DB
    setVehicles(prev => prev.map(v => v.id === event.busId ? { ...v, status: 'emergency' } : v));
    
    // Add activity and notification
    addActivity(`EMERGENCY: ${event.type} reported on ${bus?.busNumber || 'Bus'}.`, 'emergency', event.busId, event.routeId);
    sendNotification('error', `CRITICAL: ${event.type} on ${bus?.busNumber || 'Bus'}. Info: ${event.description}`, event.busId, event.routeId);
  };

  const acknowledgeEmergency = (id: string) => {
    setEmergies(prev => prev.map(e => e.id === id ? { ...e, status: 'acknowledged' } : e));
    const ev = emergencies.find(e => e.id === id);
    if (ev) {
      addActivity(`Emergency ${ev.id} acknowledged by Admin.`, 'general', ev.busId, ev.routeId);
      sendNotification('info', `Emergency alert ${ev.id} has been acknowledged. Action is being taken.`, ev.busId, ev.routeId);
      // Persist status change to Supabase immediately
      if (isSupabaseConfigured() && supabase) {
        supabase.from('emergencies').update({ status: 'acknowledged' }).eq('id', id).then(() => {});
      }
    }
  };

  const respondEmergency = (id: string) => {
    setEmergies(prev => prev.map(e => e.id === id ? { ...e, status: 'responding' } : e));
    const ev = emergencies.find(e => e.id === id);
    if (ev) {
      addActivity(`Response dispatch initiated for Emergency ${ev.id}.`, 'general', ev.busId, ev.routeId);
      // Persist status change to Supabase immediately
      if (isSupabaseConfigured() && supabase) {
        supabase.from('emergencies').update({ status: 'responding' }).eq('id', id).then(() => {});
      }
    }
  };

  const resolveEmergency = (id: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setEmergies(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved', resolvedTime: timeStr } : e));
    
    const ev = emergencies.find(e => e.id === id);
    if (ev) {
      addActivity(`Emergency ${ev.id} resolved successfully.`, 'complete', ev.busId, ev.routeId);
      sendNotification('success', `Emergency ${ev.id} involving ${vehicles.find(v => v.id === ev.busId)?.busNumber || 'Bus'} is resolved.`, ev.busId, ev.routeId);
      
      // Revert vehicle status back to active
      setVehicles(prev => prev.map(v => v.id === ev.busId ? { ...v, status: 'active' } : v));

      // Persist resolved status + time to Supabase immediately
      if (isSupabaseConfigured() && supabase) {
        supabase.from('emergencies').update({ status: 'resolved', resolved_time: timeStr }).eq('id', id).then(() => {});
      }
    }
  };

  const assignReplacementBus = (emergencyId: string, replacementBusId: string) => {
    const ev = emergencies.find(e => e.id === emergencyId);
    if (!ev) return;

    const repBus = vehicles.find(v => v.id === replacementBusId);
    if (!repBus) return;

    // Shift students of the broken bus to the replacement bus in our context
    setStudents(prev => prev.map(s => {
      if (s.busId === ev.busId && s.boardingStatus === 'boarded') {
        return { ...s, busId: replacementBusId };
      }
      return s;
    }));

    // Update speeds/coordinates
    setVehicles(prev => prev.map(v => {
      if (v.id === ev.busId) {
        return { ...v, currentStudents: 0, status: 'inactive', currentSpeed: 0 };
      }
      if (v.id === replacementBusId) {
        return { ...v, currentStudents: ev.studentsOnboard, status: 'active', routeId: ev.routeId, driverId: ev.driverId };
      }
      return v;
    }));

    // Update Route driver and bus
    setRoutes(prev => prev.map(r => r.id === ev.routeId ? { ...r, busId: replacementBusId } : r));

    addActivity(`Replacement bus ${repBus.busNumber} dispatched for route ${ev.routeId}.`, 'general', replacementBusId, ev.routeId);
    sendNotification('success', `Replacement ${repBus.busNumber} has taken over the passengers of ${vehicles.find(v => v.id === ev.busId)?.busNumber}.`, replacementBusId, ev.routeId);
  };

  const sendNotification = (type: Notification['type'], message: string, busId?: string, routeId?: string) => {
    const newNtf: Notification = {
      id: `NTF-${Date.now()}`,
      type,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      busId,
      routeId,
      read: false
    };
    setNotifications(prev => [newNtf, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addActivity = (text: string, type: Activity['type'], busId?: string, routeId?: string) => {
    const act: Activity = {
      id: `ACT-${Date.now()}`,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      busId,
      routeId,
      type
    };
    setActivities(prev => [act, ...prev]);
  };

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateSettings = (updated: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updated }));
    addActivity("Settings updated.", "general");
  };

  const resetDemoData = () => {
    localStorage.removeItem('sct_vehicles');
    localStorage.removeItem('sct_routes');
    localStorage.removeItem('sct_students');
    localStorage.removeItem('sct_drivers');
    localStorage.removeItem('sct_emergencies');
    localStorage.removeItem('sct_notifications');
    localStorage.removeItem('sct_activities');
    localStorage.removeItem('sct_settings');
    seedData();
    setSimulationActive(true);
    addActivity("Demo simulation database reset to original defaults.", "general");
    sendNotification('success', "Database reset completed.");
  };

  // ==========================================
  // GPS & SIMULATION ENGINE
  // ==========================================
  useEffect(() => {
    if (!simulationActive || !settings.gpsSimulation || !initialized) return;

    const interval = setInterval(() => {
      // 1. Move active running routes
      setRoutes(prevRoutes => {
        let routesUpdated = false;
        const nextRoutes = prevRoutes.map(route => {
          if (route.status !== 'running' || !Array.isArray(route.path) || route.path.length === 0) return route;
          
          routesUpdated = true;
          const nextIndex = route.currentPathIndex + 1;
          
          if (nextIndex >= route.path.length) {
            // Completed route!
            // We'll handle state updates outside mapping to prevent hooks problems,
            // or we can set it to completed right here.
            return {
              ...route,
              status: 'completed' as const,
              currentPathIndex: route.path.length - 1
            };
          }

          // Check if we hit a stop
          const currentPos = route.path[nextIndex];
          const updatedStops = route.stops.map(stop => {
            if (stop.status !== 'pending') return stop;
            
            // Simple threshold: if we are near the stop coordinate
            const dist = Math.sqrt(Math.pow(stop.lat - currentPos[0], 2) + Math.pow(stop.lng - currentPos[1], 2));
            if (dist < 0.005) {
              // Mark arrived!
              return {
                ...stop,
                status: 'arrived' as const,
                actualTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
            return stop;
          });

          return {
            ...route,
            currentPathIndex: nextIndex,
            stops: updatedStops
          };
        });

        // If any route completed during this tick, trigger notification
        nextRoutes.forEach((nr, idx) => {
          const oldR = prevRoutes[idx];
          if (oldR.status === 'running' && nr.status === 'completed') {
            setTimeout(() => {
              stopRoute(nr.id);
            }, 100);
          }
        });

        return nextRoutes;
      });

      // 2. Update speeds & GPS statuses on active vehicles
      setVehicles(prevVehicles => {
        return prevVehicles.map(v => {
          if (v.status !== 'active') return v;
          
          // Randomize speed slightly, check speed limits
          let newSpeed = v.currentSpeed + Math.floor(Math.random() * 9) - 4;
          if (newSpeed < 20) newSpeed = 25;
          if (newSpeed > 65) newSpeed = 55; // cap it unless overspeeding triggered

          // Trigger overspeeding alert randomly in simulation if speed > limit
          const isOverspeeding = newSpeed > v.maxSpeedLimit;
          if (isOverspeeding && Math.random() < 0.05) {
            // Trigger emergency event for overspeeding
            setTimeout(() => {
              const alreadyHasOverspeed = emergencies.some(e => e.busId === v.id && e.type === 'Overspeeding' && e.status === 'active');
              if (!alreadyHasOverspeed) {
                triggerEmergency({
                  busId: v.id,
                  routeId: v.routeId,
                  location: { lat: 12.9716, lng: 77.5946 }, // approximate
                  severity: 'high',
                  type: 'Overspeeding',
                  description: `Vehicle exceeding speed limits. Speed recorded: ${newSpeed} km/h (Limit: ${v.maxSpeedLimit} km/h).`
                });
              }
            }, 100);
          }

          return {
            ...v,
            currentSpeed: newSpeed
          };
        });
      });

    }, 4000); // simulation ticks smoothly every 4 seconds

    return () => clearInterval(interval);
  }, [simulationActive, settings.gpsSimulation, initialized]);

  return (
    <AppContext.Provider value={{
      vehicles,
      routes,
      students,
      drivers,
      emergencies,
      notifications,
      activities,
      settings,
      simulationActive,
      gpsDevices,
      
      setSimulationActive,
      startRoute,
      stopRoute,
      addRoute,
      editRoute,
      deleteRoute,
      addVehicle,
      editVehicle,
      deleteVehicle,
      changeVehicleStatus,
      assignDriver,
      addDriver,
      editDriver,
      deleteDriver,
      addStudent,
      editStudent,
      deleteStudent,
      markStudentBoarding,
      markChildAbsentToday,
      triggerEmergency,
      acknowledgeEmergency,
      respondEmergency,
      resolveEmergency,
      assignReplacementBus,
      sendNotification,
      markNotificationRead,
      markAllNotificationsRead,
      addActivity,
      updateSettings,
      resetDemoData,
      toasts,
      addToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
