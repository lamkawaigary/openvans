// ============================================
// OpenVan Type Definitions
// ============================================

// User roles
// 'driver' = 司機 / 車主 (provides vans + accepts bookings)
// 'renter' = 乘客 / 客戶 (books vans)
// 'admin'  = 管理員
export type UserRole = 'driver' | 'renter' | 'admin';

// ─── Vehicle types (Hong Kong freight standard) ────────────────────────────────
// 香港貨運標準車型
export type VehicleType = 'motorcycle' | 'light' | 'truck_5_5t' | 'truck_9_5t' | 'sedan' | 'van_7';
// motorcycle  = 電單車（50kg以下，快遞/小型緊急件）
// light       = 輕型貨車（~1噸，HiAce/TownAce類）
// truck_5_5t  = 5.5噸貨車（~2噸，Elf/Canter類）
// truck_9_5t  = 9.5噸貨車（~4噸，Forward類）
// sedan       = 轎車（1-4人）
// van_7       = 七人車（1-6人）

// Legacy alias for backward compat
export type VanType = VehicleType;

// Booking status
export type BookingStatus =
  | 'pending'    // Awaiting driver acceptance
  | 'confirmed'  // Driver accepted
  | 'in_progress' // Van en route / in service
  | 'completed'  // Service finished
  | 'cancelled'; // Cancelled by either party

// Luggage/load categories (cargo type)
export type LoadType =
  | 'small'      // 🎒 Small parcels / hand carry
  | 'medium'     // 🧳 Medium boxes / luggage
  | 'large';     // 📦 Large items / furniture

// ============================================
// Core Entities
// ============================================

export interface User {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;           // 'driver' | 'renter' | 'admin'
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Van {
  id: string;
  // driverId = the driver's uid who owns this van (kept as 'driverId' for backward
  // compat with Firestore schema; semantically this is the driver's uid).
  driverId: string;
  plateNumber: string;       // e.g. "TV 1234"
  vehicleType: VehicleType;  // 'motorcycle' | 'light' | 'truck_5_5t'
  make: string;              // e.g. "Toyota"
  model: string;             // e.g. "HiAce"
  capacityKg: number;        // Max load in kg
  capacityM3: number;        // Volume in cubic meters
  photoUrl?: string;
  isAvailable: boolean;
  isVerified: boolean;
  createdAt: string;
  // Current location (optional, for tracking)
  currentLat?: number;
  currentLng?: number;
}

export interface BookingLoad {
  type: LoadType;
  count: number;
}

export interface Booking {
  id: string;
  renterId: string;          // uid of person who booked (乘客)
  vanId?: string;            // Assigned van (set when confirmed)
  // driverId = assigned driver's uid (set when driver accepts). Field name kept
  // as 'driverId' for backward compat with Firestore schema. Semantically this
  // is the driver's uid (same person as role 'driver').
  driverId?: string;

  // Pickup & drop-off
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;

  // Route waypoints (optional intermediate stops)
  waypoints?: Array<{
    address: string;
    lat?: number;
    lng?: number;
  }>;

  // Service type (Phase 6)
  serviceType?: 'delivery' | 'truck' | 'cross_border';

  // Cross-border specifics (Phase 6, only when serviceType='cross_border')
  crossBorderCheckpoint?: string;  // e.g. 'huanggang' | 'shatoujiao' | 'luohu' | 'lokma Chau' | 'man kam to' | 'futian'
  crossBorderNotes?: string;       // Customs declaration notes

  // Load info
  loads: BookingLoad[];
  totalLoadCount: number;
  loadDescription?: string; // Description of goods being moved

  // Vehicle type required
  vehicleTypeRequired: VehicleType;

  // Pricing
  estimatedPrice?: number;
  finalPrice?: number;

  // Full fare breakdown (stored at booking creation)
  fareBreakdown?: FareBreakdown;

  // Route info (stored at booking creation)
  routeInfo?: {
    distanceKm: number;
    distanceMeters: number;
    durationMinutes: number;
  };

  // Pricing extras (set by driver or system)
  tunnelFee?: number;       // Tunnel crossing surcharge (HK$30 per tunnel)
  parkingFee?: number;      // Actual parking fees incurred
  stairFloors?: number;     // Number of stairs carried up/down
  extraStopFee?: number;    // Per-stop surcharge

  // Status
  status: BookingStatus;
  statusHistory?: Array<{
    status: BookingStatus;
    at: string;
    by: string;
  }>;

  // Timestamps
  pickupTime: string;        // Desired pickup datetime
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;

  // Notes
  notes?: string;
}

// ============================================
// Notification
// ============================================
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  linkTo?: string;
}

// ============================================
// Pricing Types
// ============================================

// Delivery speed / time slot
export type DeliverySpeed = 'immediate' | '4hour' | 'sameday' | 'scheduled';

// Load weight category
export type LoadWeight = 'light' | 'medium' | 'heavy'; // <10kg / 10-50kg / 50kg+

// Tunnel type (Hong Kong)
export type TunnelType = 'crossing' | 'eastern' | 'western' | 'shatin';

// Input to fare calculator
export interface PricingInput {
  pickupCoord: [number, number];
  dropoffCoord: [number, number];
  vehicleType: VehicleType;
  speed: DeliverySpeed;
  scheduledTime?: Date;
  extraStops: number;
  loadSize: 'small' | 'medium' | 'large';
  loadWeight: LoadWeight;
  hasInsurance: boolean;
  hasAssistant: boolean;
  // Phase 1 new fields
  tunnelsCrossed?: TunnelType[];   // Tunnels on route
  parkingFee?: number;              // Actual parking cost
  stairFloors?: number;             // Stairs carried up
  notes?: string;
}

// Calculated fare breakdown
export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  speedSurcharge: number;
  peakSurge: number;
  lateNightSurge: number;
  weekendSurge: number;
  extraStopFare: number;
  loadSurcharge: number;
  insuranceFare: number;
  assistantFare: number;
  tunnelFare: number;          // NEW: tunnel surcharge
  parkingFare: number;          // NEW: parking reimbursement
  stairFare: number;            // NEW: stair surcharge
  total: number;
  currency: string;
  distanceKm: number;           // Actual route distance (km)
  distanceMeters: number;       // Raw meters from Directions API
  estimatedMinutes: number;     // Actual driving time
  tollsReserved: number;       // Toll amount reserved
  minimumFare: number;         // Floor to protect short trips
}

// Route info from Google Directions API
export interface RouteInfo {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes: number;
  polylinePoints: [number, number][];
  tollsUsed: number;           // Toll cost returned by API
  tunnelsUsed: TunnelType[];   // Which tunnels detected on route
}

// ============================================
// Helper type for form submissions
// ============================================
export interface BookingFormData {
  pickupAddress: string;
  dropoffAddress: string;
  waypoints: Array<{ address: string; lat?: number; lng?: number }>;
  loads: BookingLoad[];
  vehicleTypeRequired: VehicleType;
  pickupTime: string;
  loadDescription: string;
  notes: string;
}