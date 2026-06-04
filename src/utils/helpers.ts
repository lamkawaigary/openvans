import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhHK } from 'date-fns/locale';
import type { BookingStatus, VehicleType, LoadType } from '../types';

// ============================================
// Date / Time Formatting
// ============================================
export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy/MM/dd HH:mm', { locale: zhHK });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MM/dd', { locale: zhHK });
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: zhHK });
  } catch {
    return '';
  }
}

export function formatPickupTime(iso: string): string {
  try {
    const date = parseISO(iso);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 0) return '已過期';
    if (hours < 1) return '立即';
    if (hours < 24) return `${Math.round(hours)} 小時後`;
    return format(date, 'MM/dd HH:mm', { locale: zhHK });
  } catch {
    return iso;
  }
}

// ============================================
// Status Helpers
// ============================================
export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: '等待接單',
  confirmed: '已確認',
  in_progress: '服務中',
  completed: '已完成',
  cancelled: '已取消',
};

export const STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  pending: { bg: '#fff3e0', text: '#e65100' },
  confirmed: { bg: '#e3f2fd', text: '#0d47a1' },
  in_progress: { bg: '#e8f5e9', text: '#1b5e20' },
  completed: { bg: '#f5f5f5', text: '#616161' },
  cancelled: { bg: '#ffebee', text: '#b71c1c' },
};

export function getStatusBadge(status: BookingStatus) {
  const { bg, text } = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  return { bg, text, label };
}

// ============================================
// Vehicle Type Helpers (Hong Kong freight)
// ============================================
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  motorcycle: '電單車',
  light: '輕型貨車',
  truck_5_5t: '5.5噸貨車',
};

// Backward compat alias
export const VAN_TYPE_LABELS = VEHICLE_TYPE_LABELS;

export const VEHICLE_TYPE_EMOJI: Record<VehicleType, string> = {
  motorcycle: '🛵',
  light: '🚚',
  truck_5_5t: '🚛',
};

// Backward compat alias
export const VAN_TYPE_EMOJI = VEHICLE_TYPE_EMOJI;

export const VEHICLE_TYPE_CAPACITY: Record<VehicleType, { kg: string; m3: string; desc: string }> = {
  motorcycle: { kg: '~50kg', m3: '~0.1m³', desc: '文件/小型包裹' },
  light: { kg: '~1000kg', m3: '~5m³', desc: '小型搬家/速遞' },
  truck_5_5t: { kg: '~2000kg', m3: '~10m³', desc: '中型搬家/商業' },
};

// Backward compat alias
export const VAN_TYPE_CAPACITY = VEHICLE_TYPE_CAPACITY;

// ============================================
// Load Type Helpers
// ============================================
export const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  small: '📦 小件',
  medium: '🧳 中件',
  large: '🚢 大件',
};

// ─── Price Estimation (using VehicleType) ──────────────────────────────

export function estimatePrice(
  vehicleType: VehicleType,
  distanceKm: number,
  loadCount: number
): number {
  const ratePerKm: Record<VehicleType, number> = {
    motorcycle: 4,
    light: 6,
    truck_5_5t: 9,
  };
  const base = 40;
  return Math.round((ratePerKm[vehicleType] * distanceKm + base) * loadCount * 0.5 + base);
}

// ============================================
// Misc
// ============================================
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
