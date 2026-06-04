import type { VehicleType, TunnelType, DeliverySpeed, FareBreakdown } from '../types';
import { GOOGLE_MAPS_API_KEY } from '../firebase/config';

// ─── Vehicle type base fares (HK$) ─────────────────────────────────────
const BASE_FARES: Record<VehicleType, number> = {
  motorcycle: 30,   // 電單車
  light: 60,        // 輕型貨車
  truck_5_5t: 100,  // 5.5噸貨車
};

// Per-km rates (HK$)
const PER_KM_RATES: Record<VehicleType, number> = {
  motorcycle: 2.5,
  light: 4.0,
  truck_5_5t: 6.0,
};

// Minimum fare floors (HK$)
const MINIMUM_FARE: Record<VehicleType, number> = {
  motorcycle: 25,
  light: 50,
  truck_5_5t: 90,
};

// Speed multipliers
const SPEED_MULTIPLIERS: Record<DeliverySpeed, number> = {
  immediate: 1.3,   // 即時：加 30%
  '4hour': 1.0,     // 4小時：標準
  sameday: 0.9,     // 即日：9折
  scheduled: 0.85,  // 預約：85折
};

// Peak hours 峰時
const PEAK_MORNING = { start: 7, end: 9 };
const PEAK_EVENING = { start: 17, end: 20 };
const LATE_NIGHT_START = 23;
const LATE_NIGHT_END = 6;

// ─── Tunnel fees ──────────────────────────────────────────────────────────
const TUNNEL_FEE_PER = 30; // HK$ per tunnel crossing

// ─── Stair fee ───────────────────────────────────────────────────────────
const STAIR_FEE_PER_FLOOR = 20; // HK$ per floor

// ─── Load surcharges (based on size/weight) ──────────────────────────────
const LOAD_SURCHARGE: Record<string, number> = {
  small_light: 0,
  small_medium: 10,
  small_heavy: 20,
  medium_light: 0,
  medium_medium: 15,
  medium_heavy: 30,
  large_light: 10,
  large_medium: 25,
  large_heavy: 50,
};

// ─── Google Directions API ────────────────────────────────────────────────
export interface RouteResult {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes: number;
  polylinePoints: [number, number][];
  tollsUsed: number;
  tunnelsUsed: TunnelType[];
}

/**
 * Get route info using Google Directions API.
 * Falls back to Haversine if API fails.
 */
export async function getRouteInfo(
  origin: [number, number],
  destination: [number, number],
  waypoints: [number, number][] = []
): Promise<RouteResult> {
  // Build waypoints string
  const waypointStr = waypoints.length > 0
    ? '&waypoints=' + waypoints.map(([lat, lng]) => `${lat},${lng}`).join('|')
    : '';

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}${waypointStr}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Directions API failed');
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const overviewPolyline = route.overview_polyline.points;

      // Decode polyline
      const polylinePoints = decodePolyline(overviewPolyline);

      // Estimate tolls (simplified - API returns tolls if available)
      const tollsUsed = route.fare ? route.fare.value : 0;

      // Detect tunnels from summary
      const tunnelsUsed: TunnelType[] = [];
      const summary = (route.summary || '').toLowerCase();
      if (summary.includes('cross harbour') || summary.includes('crossing')) tunnelsUsed.push('crossing');
      if (summary.includes('eastern') || summary.includes('東隧')) tunnelsUsed.push('eastern');
      if (summary.includes('western') || summary.includes('西隧')) tunnelsUsed.push('western');
      if (summary.includes('shatin') || summary.includes('沙田')) tunnelsUsed.push('shatin');

      return {
        distanceKm: leg.distance.value / 1000,
        distanceMeters: leg.distance.value,
        durationMinutes: Math.round(leg.duration.value / 60),
        polylinePoints: polylinePoints,
        tollsUsed,
        tunnelsUsed,
      };
    }
  } catch (e) {
    console.warn('[OpenVans] Directions API failed, falling back to Haversine:', e);
  }

  // Fallback to Haversine
  const distanceKm = haversineKm(origin, destination);
  return {
    distanceKm,
    distanceMeters: Math.round(distanceKm * 1000),
    durationMinutes: estimateMinutes(distanceKm, 0),
    polylinePoints: generateRouteWaypoints(origin, destination, 7),
    tollsUsed: 0,
    tunnelsUsed: [],
  };
}

/**
 * Calculate fare with full breakdown (uses Haversine for distance if Directions fails)
 */
export function calculateFare(params: {
  pickupCoord: [number, number];
  dropoffCoord: [number, number];
  vehicleType: VehicleType;
  speed: DeliverySpeed;
  scheduledTime?: Date;
  extraStops: number;
  loadSize: 'small' | 'medium' | 'large';
  loadWeight: 'light' | 'medium' | 'heavy';
  hasInsurance: boolean;
  hasAssistant: boolean;
  tunnelsCrossed?: TunnelType[];
  parkingFee?: number;
  stairFloors?: number;
  // Pre-fetched route (optional - if not provided, uses Haversine)
  routeDistanceKm?: number;
  routeDurationMinutes?: number;
}): FareBreakdown {
  const {
    vehicleType, speed, scheduledTime, extraStops,
    loadSize, loadWeight, hasInsurance, hasAssistant,
    tunnelsCrossed = [], parkingFee = 0, stairFloors = 0,
    routeDistanceKm, routeDurationMinutes,
  } = params;

  // Use provided route distance or calculate from Haversine
  const distanceKm = routeDistanceKm ?? haversineKm(params.pickupCoord, params.dropoffCoord);
  const effectiveDate = scheduledTime || new Date();

  const baseFare = BASE_FARES[vehicleType] || 60;
  const perKmRate = PER_KM_RATES[vehicleType] || 4.0;
  const minimumFare = MINIMUM_FARE[vehicleType] || 50;

  // Distance fare
  const distanceFare = Math.round(distanceKm * perKmRate);

  // Speed surcharge (applied to base + distance)
  const speedMultiplier = SPEED_MULTIPLIERS[speed] || 1.0;
  const speedSurcharge = Math.round((baseFare + distanceFare) * (speedMultiplier - 1));

  // Peak / Late-night (on base + distance + speed surcharge)
  let peakSurge = 0;
  let lateNightSurge = 0;
  const surchargeBase = baseFare + distanceFare + speedSurcharge;
  if (isLateNight(effectiveDate)) {
    lateNightSurge = Math.round(surchargeBase * 0.20);
  } else if (isPeakHour(effectiveDate)) {
    peakSurge = Math.round(surchargeBase * 0.15);
  }

  // Weekend
  const weekendSurge = isWeekend(effectiveDate)
    ? Math.round((baseFare + distanceFare) * 0.08)
    : 0;

  // Extra stops
  const extraStopFare = extraStops * 20;

  // Load surcharge
  const loadKey = `${loadSize}_${loadWeight}`;
  const loadSurcharge = LOAD_SURCHARGE[loadKey] || 0;

  // Insurance
  const insuranceFare = hasInsurance ? 20 : 0;

  // Assistant
  const assistantFare = hasAssistant ? 30 : 0;

  // Tunnel fee
  const tunnelFare = tunnelsCrossed.length * TUNNEL_FEE_PER;

  // Parking fee (driver-claimed)
  const parkingFare = parkingFee;

  // Stair fee
  const stairFare = stairFloors * STAIR_FEE_PER_FLOOR;

  // Subtotal before minimum check
  const subtotal = (
    baseFare + distanceFare + speedSurcharge +
    peakSurge + lateNightSurge + weekendSurge +
    extraStopFare + loadSurcharge + insuranceFare + assistantFare +
    tunnelFare + parkingFare + stairFare
  );

  // Apply minimum fare floor
  const total = Math.max(minimumFare, subtotal);

  return {
    baseFare,
    distanceFare,
    speedSurcharge,
    peakSurge,
    lateNightSurge,
    weekendSurge,
    extraStopFare,
    loadSurcharge,
    insuranceFare,
    assistantFare,
    tunnelFare,
    parkingFare,
    stairFare,
    total,
    currency: 'HK$',
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceMeters: Math.round(distanceKm * 1000),
    estimatedMinutes: routeDurationMinutes ?? estimateMinutes(distanceKm, extraStops),
    minimumFare,
    tollsReserved: 0,
  };
}

// Backward compat alias
export const calculateVanFare = calculateFare;

// ─── Helpers ──────────────────────────────────────────────────────────────

function isPeakHour(date: Date): boolean {
  const h = date.getHours();
  return (
    (h >= PEAK_MORNING.start && h < PEAK_MORNING.end) ||
    (h >= PEAK_EVENING.start && h < PEAK_EVENING.end)
  );
}

function isLateNight(date: Date): boolean {
  const h = date.getHours();
  return h >= LATE_NIGHT_START || h < LATE_NIGHT_END;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Haversine (km) - fallback when Directions API unavailable
export function haversineKm(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371;
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1[0] * Math.PI / 180) *
    Math.cos(coord2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate minutes from distance
function estimateMinutes(distanceKm: number, numStops: number): number {
  const avgSpeedKmh = 25;
  const stopTime = 4;
  return Math.round((distanceKm / avgSpeedKmh) * 60 + numStops * stopTime);
}

// Generate waypoints for route line on map (fallback polyline)
export function generateRouteWaypoints(
  pickup: [number, number],
  dropoff: [number, number],
  numPoints = 5
): [number, number][] {
  const points: [number, number][] = [pickup];
  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1);
    const jitter = i === Math.floor(numPoints / 2) ? 0.003 : 0;
    points.push([
      pickup[0] + (dropoff[0] - pickup[0]) * t + jitter,
      pickup[1] + (dropoff[1] - pickup[1]) * t + jitter * 0.5,
    ]);
  }
  points.push(dropoff);
  return points;
}

export function formatFare(amount: number): string {
  return `HK$${amount}`;
}

// Quick estimate (for display before full calculation)
export function quickEstimate(
  distanceKm: number,
  vehicleType: VehicleType,
  speed: DeliverySpeed
): number {
  const baseFare = BASE_FARES[vehicleType] || 60;
  const perKmRate = PER_KM_RATES[vehicleType] || 4.0;
  const distFare = Math.round(distanceKm * perKmRate);
  const mult = SPEED_MULTIPLIERS[speed] || 1.0;
  return Math.round((baseFare + distFare) * mult);
}

// ─── Polyline decoder (for Google Directions) ────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}