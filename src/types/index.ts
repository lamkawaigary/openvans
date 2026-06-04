// ============================================
// OpenVan Type Definitions
// ============================================

// User roles
export type UserRole = 'owner' | 'renter' | 'admin';

// ─── Vehicle types (Hong Kong freight standard) ────────────────────────────────
// 香港貨運標準車型
export type VehicleType = 'motorcycle' | 'light' | 'truck_5_5t';
// motorcycle  = 電單車（50kg以下，快遞/小型緊急件）
// light       = 輕型貨車（~1噸，HiAce/TownAce類）
// truck_5_5t  = 5.5噸貨車（~2噸，Elf/Canter類）

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
  role: UserRole;           // 'owner' | 'renter'
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Van {
  id: string;
  ownerId: string;           // uid of van owner
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
  renterId: string;          // uid of person who booked
  vanId?: string;           // Assigned van (set when confirmed)
  ownerId?: string;         // Van owner (set when confirmed)

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