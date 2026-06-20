import React from 'react';
import { colors } from '../styles';

// ─── Icon mapping ─────────────────────────────────────────────────────────────
// All icons use consistent 24x24 viewBox, stroke-based (feather icons style)

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_SIZE = 20;
const DEFAULT_COLOR = colors.darkGrey;

// ─── SVG Paths ────────────────────────────────────────────────────────────────

export const IconPackage = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export const IconTruck = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

export const IconLargeTruck = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="4" width="18" height="12"/>
    <polygon points="20 6 20 16 22 16 22 6"/>
    <circle cx="6" cy="20" r="2"/>
    <circle cx="18" cy="20" r="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

export const IconMotorcycle = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="5" cy="17" r="3"/>
    <circle cx="19" cy="17" r="3"/>
    <path d="M8.5 17h7"/>
    <path d="M5 14l3-5h6l2 3"/>
    <path d="M15 9l3 2"/>
  </svg>
);

export const IconCar = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
    <circle cx="7.5" cy="17" r="2"/>
    <circle cx="16.5" cy="17" r="2"/>
    <path d="M5 12h14"/>
    <path d="M5 12l2-4h10l2 4"/>
  </svg>
);

export const IconPickup = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="8" width="20" height="9"/>
    <path d="M2 14h20"/>
    <path d="M6 8V5a1 1 0 011-1h6l3 3"/>
    <circle cx="6" cy="18" r="2"/>
    <circle cx="18" cy="18" r="2"/>
  </svg>
);

export const IconClipboard = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="8" y1="11" x2="16" y2="11"/>
    <line x1="8" y1="15" x2="13" y2="15"/>
  </svg>
);

export const IconHome = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const IconUser = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export const IconSettings = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

export const IconChat = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

export const IconDocument = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export const IconLogout = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export const IconChart = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

export const IconMail = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export const IconPhone = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

export const IconMapPin = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

export const IconCheck = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const IconX = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const IconChevronUp = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

export const IconChevronDown = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const IconArrowUp = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

export const IconArrowDown = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
);

export const IconDot = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
    <circle cx="12" cy="12" r="6"/>
  </svg>
);

export const IconInfo = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export const IconWarning = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const IconError = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

export const IconSuccess = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export const IconWrench = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

export const IconLuggage = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 2v4"/>
    <path d="M16 2v4"/>
    <rect x="4" y="6" width="16" height="16" rx="2"/>
    <path d="M4 10h16"/>
    <path d="M8 14h.01"/>
    <path d="M8 18h.01"/>
  </svg>
);

export const IconShip = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 21l.32-2.34a5.2 5.2 0 014.96-3.66h8.84a5.2 5.2 0 014.96 3.66L22 21"/>
    <path d="M12 6V2"/>
    <path d="M4 11l4-4 4 4 4-4 4 4"/>
    <path d="M4 15l4-4 4 4 4-4 4 4"/>
  </svg>
);

export const IconTrash = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

export const IconArrowRight = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

export const IconLock = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export const IconUsers = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

export const IconDollar = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);

export const IconClock = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// Vehicle type icon helper
export const VehicleTypeIcon: React.FC<IconProps & { vehicleType: string }> = ({ vehicleType, size = DEFAULT_SIZE, color = DEFAULT_COLOR, ...props }) => {
  if (vehicleType === 'motorcycle') return <IconMotorcycle size={size} color={color} {...props} />;
  if (vehicleType === 'light' || vehicleType === 'van') return <IconTruck size={size} color={color} {...props} />;
  if (vehicleType === 'truck_5_5t' || vehicleType === 'truck_9_5t') return <IconLargeTruck size={size} color={color} {...props} />;
  if (vehicleType === 'van_7' || vehicleType === 'sedan') return <IconCar size={size} color={color} {...props} />;
  return <IconTruck size={size} color={color} {...props} />;
};

// ─── Emoji → Icon mapping ──────────────────────────────────────────────────────

export const emojiToIcon: Record<string, React.FC<IconProps>> = {
  '📦': IconPackage,
  '🚚': IconTruck,
  '🚛': IconLargeTruck,
  '🏍️': IconMotorcycle,
  '🚗': IconCar,
  '🛻': IconPickup,
  '📋': IconClipboard,
  '🏠': IconHome,
  '👤': IconUser,
  '⚙️': IconSettings,
  '💬': IconChat,
  '📄': IconDocument,
  '🚪': IconLogout,
  '📊': IconChart,
  '📭': IconMail,
  '📱': IconPhone,
  '📍': IconMapPin,
  '✅': IconCheck,
  '❌': IconX,
  '✕': IconX,
  '✓': IconCheck,
  '▲': IconChevronUp,
  '▼': IconChevronDown,
  '●': IconDot,
  'ℹ️': IconInfo,
  '⚠️': IconWarning,
  '🔧': IconWrench,
  '🧳': IconLuggage,
  '🚢': IconShip,
  '🗑️': IconTrash,
  '🔒': IconLock,
};

// Fallback: renders the emoji as-is if not in our map
interface SvgIconProps extends IconProps {
  emoji: string;
}

export const SvgIcon: React.FC<SvgIconProps> = ({ emoji, size, color, ...props }) => {
  const IconComponent = emojiToIcon[emoji];
  if (!IconComponent) {
    // Fallback to emoji
    return <span style={{ fontSize: size }}>{emoji}</span>;
  }
  return <IconComponent size={size} color={color} {...props} />;
};

export default SvgIcon;
