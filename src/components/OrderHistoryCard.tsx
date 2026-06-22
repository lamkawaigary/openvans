import { useAuth } from '../context/AuthContext';
import { getViewerRole } from '../utils/phoneFormat';
import { useUnreadCount, UnreadBadge } from './UnreadBadge';
import { colors, sp, rd } from '../styles';
import type { Booking } from '../types';
import { formatDate, getStatusBadge, VAN_TYPE_EMOJI } from '../utils/helpers';

interface OrderHistoryCardProps {
  booking: Booking;
  onClick: () => void;
}

export default function OrderHistoryCard({ booking, onClick }: OrderHistoryCardProps) {
  const badge = getStatusBadge(booking.status);
  const dateStr = formatDate(booking.pickupTime);

  // Phase 8 — chat unread count for this card
  const { user } = useAuth();
  const viewerRole = user ? getViewerRole(booking, user.uid) : null;
  const unreadCount = useUnreadCount(booking.id, user?.uid ?? '', viewerRole);

  return (
    <div style={styles.card} onClick={onClick}>
      {/* Phase 8 — unread badge overlay */}
      <UnreadBadge count={unreadCount} />
      {/* Top row: date + vehicle + status badge + price */}
      <div style={styles.topRow}>
        <div style={styles.dateVan}>
          <span style={styles.dateText}>{dateStr}</span>
          <span style={styles.vanEmoji}>{VAN_TYPE_EMOJI[booking.vehicleTypeRequired]}</span>
        </div>
        <div style={styles.statusPrice}>
          <span style={{ ...styles.statusBadge, background: badge.bg, color: badge.text }}>
            {badge.label}
          </span>
          {booking.estimatedPrice && (
            <span style={styles.price}>HK${booking.estimatedPrice}</span>
          )}
        </div>
      </div>

      {/* Vertical timeline route */}
      <div style={styles.timeline}>
        <div style={styles.timelinePoint}>
          <div style={styles.hollowCircle} />
          <span style={styles.routeAddr}>{booking.pickupAddress}</span>
        </div>
        <div style={styles.vertLine} />
        <div style={styles.timelinePoint}>
          <div style={styles.pinCircle} />
          <span style={styles.routeAddr}>{booking.dropoffAddress}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: colors.white,
    borderRadius: rd.lg,
    padding: `${sp.md}px`,
    boxShadow: colors.shadowSm,
    border: `1px solid ${colors.border}`,
    cursor: 'pointer',
    marginBottom: sp.sm,
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
  },
  dateVan: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.darkGrey,
  },
  vanEmoji: {
    fontSize: 16,
  },
  statusPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
  },
  statusBadge: {
    padding: '4px 14px',
    borderRadius: rd.full,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  price: {
    fontSize: 16,
    fontWeight: 800,
    color: colors.darkGrey,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
  },
  timelinePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
  },
  hollowCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    border: `2px solid ${colors.primaryBlue}`,
    background: colors.white,
    flexShrink: 0,
  },
  pinCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    background: colors.orange,
    flexShrink: 0,
  },
  vertLine: {
    width: 2,
    height: 16,
    background: colors.lightGrey,
    marginLeft: 5,
  },
  routeAddr: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.darkGrey,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};
