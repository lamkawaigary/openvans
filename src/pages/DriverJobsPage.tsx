import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToPendingBookings, acceptBooking, BookingError } from '../services/bookings';
import { subscribeToDriver, type DriverState } from '../services/drivers';
import { notifyBookingAccepted } from '../services/notifications';
import type { Booking } from '../types';
import { colors } from '../styles';
import { formatPickupTime, VAN_TYPE_EMOJI, VAN_TYPE_LABELS } from '../utils/helpers';
import { toast } from 'sonner';

function showError(msg: string) {
  toast.error(msg, { duration: 4000 });
}
function showSuccess(msg: string) {
  toast.success(msg, { duration: 3000 });
}

export default function DriverJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allPending, setAllPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverState, setDriverState] = useState<DriverState | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Redirect non-owners
  useEffect(() => {
    if (user && user.role !== 'owner') {
      navigate('/');
    }
  }, [user]);

  // Subscribe to driver state
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDriver(user.uid, (state) => {
      setDriverState(state);
      setIsOnline(state?.isOnline ?? false);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to all pending bookings (the 公海)
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToPendingBookings((bookings) => {
      setAllPending(bookings);
      setLoading(false);
    });
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => { clearTimeout(timer); unsub(); };
  }, [user]);

  // Filter: only bookings matching driver's vehicle type
  const matchingBookings = isOnline && driverState?.vehicleType
    ? allPending.filter(b => b.vehicleTypeRequired === driverState.vehicleType)
    : [];

  const handleAccept = async (booking: Booking) => {
    if (!user || !driverState?.currentVanId) return;
    if (!isOnline) {
      showError('請先上線再接單');
      return;
    }
    setAcceptingId(booking.id);
    try {
      await acceptBooking(booking.id, user.uid, driverState.currentVanId);
      showSuccess('已接單！');
      notifyBookingAccepted(
        booking.renterId,
        booking.id,
        user.displayName || '司機',
        VAN_TYPE_EMOJI[booking.vehicleTypeRequired] + ' ' + VAN_TYPE_LABELS[booking.vehicleTypeRequired]
      ).catch(() => {});
    } catch (err: unknown) {
      if (err instanceof BookingError) showError(err.message);
      else showError('接單失敗');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
<div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={styles.title}>📋 訂單公海</span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Online status banner */}
      <div style={styles.bannerWrapper}>
        {!isOnline ? (
          <div style={styles.offlineBanner}>
            <span>🔴 請先上線再接單</span>
            <button style={styles.goOnlineBtn} onClick={() => navigate('/dashboard')}>
              去上線
</button>
          </div>
        ) : (
          <div style={styles.onlineBanner}>
            <span>🟢 已上線 · {VAN_TYPE_EMOJI[driverState?.vehicleType!]} {VAN_TYPE_LABELS[driverState?.vehicleType!]}</span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statNum}>{matchingBookings.length}</span>
          <span style={styles.statLabel}>可接訂單</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNum}>{allPending.length}</span>
          <span style={styles.statLabel}>全城待接</span>
        </div>
        {driverState?.vehicleType && (
          <>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statNum}>{VAN_TYPE_EMOJI[driverState.vehicleType]}</span>
              <span style={styles.statLabel}>你的車型</span>
            </div>
          </>
        )}
      </div>

      {/* List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.loading}>載入中…</div>
        ) : !isOnline ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🔌</div>
            <div style={styles.emptyTitle}>司機未上線</div>
            <div style={styles.emptyDesc}>請先在司機 Dashboard 上線，才能接單</div>
          </div>
        ) : matchingBookings.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📭</div>
            <div style={styles.emptyTitle}>暫時沒有合適訂單</div>
            <div style={styles.emptyDesc}>全城仲有 {allPending.length} 張單，但唔啱你架車型</div>
          </div>
        ) : (
          matchingBookings.map(b => (
            <JobCard
              key={b.id}
              booking={b}
              isOnline={isOnline}
              isAccepting={acceptingId === b.id}
              onAccept={() => handleAccept(b)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  booking: Booking;
  isOnline: boolean;
  isAccepting: boolean;
  onAccept: () => void;
}

function JobCard({ booking, isOnline, isAccepting, onAccept }: JobCardProps) {
  return (
    <div style={styles.card}>
      {/* Top row */}
      <div style={styles.cardTop}>
        <div style={styles.vehicleBadge}>
          {VAN_TYPE_EMOJI[booking.vehicleTypeRequired]} {VAN_TYPE_LABELS[booking.vehicleTypeRequired]}
</div>
        <div style={styles.pickupTime}>
          🕐 {formatPickupTime(booking.pickupTime)}
        </div>
      </div>

      {/* Route */}
      <div style={styles.routeBlock}>
        <div style={styles.routeRow}>
          <div style={{ ...styles.routeDot, background: colors.textMuted }} />
          <span style={styles.routeAddr}>{booking.pickupAddress}</span>
        </div>
        <div style={styles.routeLine} />
        <div style={styles.routeRow}>
          <div style={{ ...styles.routeDot, background: colors.primaryBlue }} />
          <span style={styles.routeAddr}>{booking.dropoffAddress}</span>
        </div>
      </div>

      {/* Meta */}
      <div style={styles.meta}>
        <span>📦 {booking.totalLoadCount} 件</span>
        {booking.estimatedPrice && (
          <span style={styles.price}>HK${booking.estimatedPrice}</span>
        )}
      </div>

      {/* Accept button */}
      <button
        style={{
          ...styles.acceptBtn,
          opacity: !isOnline || isAccepting ? 0.5 : 1,
        }}
        disabled={!isOnline || isAccepting}
        onClick={onAccept}
      >
        {isAccepting ? '接單中…' : '✓ 接單'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: colors.background,
    fontFamily: 'Inter, system-ui, sans-serif',
    paddingBottom: '24px',
  },
  header: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    background: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    paddingTop: 'env(safe-area-inset-top)',
    zIndex: 200,
    boxShadow: `0 1px 3px ${colors.border}`,
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: colors.darkGrey,
  },
  bannerWrapper: {
    paddingTop: 'max(68px, calc(56px + env(safe-area-inset-top)))',
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 4,
  },
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#fff3e0',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#e65100',
  },
  onlineBanner: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#e8f5e9',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#1b5e20',
  },
  goOnlineBtn: {
    background: '#e65100',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '8px 16px',
    background: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: '20px',
    fontWeight: 800,
    color: colors.primaryBlue,
  },
  statLabel: {
    fontSize: '11px',
    color: colors.textSecondary,
    fontWeight: 600,
  },
  statDivider: {
    width: '1px',
    height: '28px',
    background: colors.border,
  },
  list: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: colors.textMuted,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '48px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: '6px',
  },
  emptyDesc: {
    fontSize: '13px',
    color: colors.textSecondary,
  },
  card: {
    background: colors.surface,
    borderRadius: '16px',
    padding: '14px',
    boxShadow: `0 1px 3px rgba(0,0,0,0.06)`,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  vehicleBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: '#e3f2fd',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#0d47a1',
  },
  pickupTime: {
    fontSize: '12px',
    color: colors.textSecondary,
    fontWeight: 500,
  },
  routeBlock: {
    marginBottom: '10px',
  },
  routeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  routeDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  routeLine: {
    width: '2px',
    height: '14px',
    background: colors.border,
    marginLeft: '4px',
    marginTop: '2px',
    marginBottom: '2px',
  },
  routeAddr: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.textPrimary,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '12px',
  },
  price: {
    marginLeft: 'auto',
    fontSize: '16px',
    fontWeight: 800,
    color: colors.primaryBlue,
  },
  acceptBtn: {
    width: '100%',
    background: colors.primaryBlue,
    color: colors.darkGrey,
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
