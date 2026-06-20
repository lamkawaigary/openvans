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

  return (
    <div style={styles.card} onClick={onClick}>
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
    boxShadow: colors.shadowMd,
    border: '1px solid rgba(0,0,0,0.04)',
    cursor: 'pointer',
    marginBottom: sp.sm,
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
