import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSideMenu } from '../context/SideMenuContext';
import { subscribeToPendingBookings, acceptBooking, BookingError } from '../services/bookings';
import { subscribeToDriver, type DriverState } from '../services/drivers';
import { notifyBookingAccepted } from '../services/notifications';
import type { Booking } from '../types';
import { colors, sp, styles } from '../styles';
import { formatPickupTime, VAN_TYPE_EMOJI, VAN_TYPE_LABELS } from '../utils/helpers';
import {
  IconDot,
  IconCheck,
  IconPackage,
  IconTruck,
  IconLargeTruck,
  IconMotorcycle,
} from '../components/Icon';
import type { VehicleType } from '../types';

function VehicleTypeIcon({ type, size = 20, color }: { type: VehicleType; size?: number; color?: string }) {
  switch (type) {
    case 'motorcycle': return <IconMotorcycle size={size} color={color} />;
    case 'light': return <IconTruck size={size} color={color} />;
    case 'truck_5_5t': return <IconLargeTruck size={size} color={color} />;
    default: return <IconTruck size={size} color={color} />;
  }
}
import { toast } from 'sonner';

function showError(msg: string) {
  toast.error(msg, { duration: 4000 });
}
function showSuccess(msg: string) {
  toast.success(msg, { duration: 3000 });
}

export default function DriverJobsPage() {
  const { user } = useAuth();
  const { openMenu } = useSideMenu();
  const navigate = useNavigate();
  const [allPending, setAllPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverState, setDriverState] = useState<DriverState | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  // Double-confirm modal: when a driver taps 接單, show booking details and ask
  // them to confirm before actually accepting. Prevents accidental accepts.
  const [confirmingBooking, setConfirmingBooking] = useState<Booking | null>(null);

  // Redirect non-drivers
  useEffect(() => {
    if (user && user.role !== 'driver') {
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

  const handleAccept = (booking: Booking) => {
    // Step 1: validate state and show double-confirm modal.
    // The actual acceptBooking() call is in confirmAccept() below, which only
    // runs when the driver explicitly taps "確認接單" in the modal.
    if (!user || !driverState?.currentVanId) return;
    if (!isOnline) {
      showError('請先上線再接單');
      return;
    }
    setConfirmingBooking(booking);
  };

  const confirmAccept = async () => {
    // Step 2: actually accept the booking (after the driver confirms in the modal).
    if (!confirmingBooking || !user || !driverState?.currentVanId) return;
    const booking = confirmingBooking;
    setConfirmingBooking(null); // close modal immediately
    setAcceptingId(booking.id);
    try {
      await acceptBooking(booking.id, user.uid, driverState.currentVanId);
      showSuccess('已接單！');
      notifyBookingAccepted(
        booking.renterId,
        booking.id,
        user.name || '司機',
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
    <div style={styles.pageContainer}>
      {/* ── Unified Top Bar ── */}
      <div style={styles.headerBar}>
        <button style={styles.menuBtn} onClick={openMenu}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span style={styles.brand}>Open<span style={styles.brandAccent}>Vans</span></span>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Online Status Banner ── */}
      <div style={{ padding: `${sp.md}px ${sp.md}px 0` }}>
        {!isOnline ? (
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.warningBg }}>
            <span style={{ fontWeight: 600, color: '#92400E', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><IconDot size={12} color="#DC2626" /> 請先上線再接單</span>
            <button
              style={{ background: colors.warning, color: '#fff', border: 'none', borderRadius: rd.sm, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
            >去上線</button>
          </div>
        ) : (
          <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: sp.xs, background: colors.successBg }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconDot size={12} color="#10B981" /> 已上線 · <VehicleTypeIcon type={driverState?.vehicleType!} size={16} /> {VAN_TYPE_LABELS[driverState?.vehicleType!]}
            </span>
          </div>
        )}
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: sp.sm, padding: `${sp.sm}px ${sp.md}px ${sp.sm}px` }}>
        <div style={{ ...styles.card, textAlign: 'center' as const }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.brand }}>{matchingBookings.length}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 2 }}>可接訂單</div>
        </div>
        <div style={{ ...styles.card, textAlign: 'center' as const }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.textPrimary }}>{allPending.length}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 2 }}>全城待接</div>
        </div>
        {driverState?.vehicleType && (
          <div style={{ ...styles.card, textAlign: 'center' as const }}>
            <VehicleTypeIcon type={driverState.vehicleType} size={24} color={colors.brand} />
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 2 }}>你的車型</div>
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ padding: `0 ${sp.md}px ${sp.xxl}px`, display: 'flex', flexDirection: 'column' as const, gap: sp.sm }}>
        {loading ? (
          <div style={styles.emptyState}>載入中…</div>
        ) : !isOnline ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}><IconDot size={32} color={colors.textMuted} /></div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>司機未上線</div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>請先在司機 Dashboard 上線，才能接單</div>
          </div>
        ) : matchingBookings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}><IconPackage size={32} color={colors.textMuted} /></div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>暫時沒有合適訂單</div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>全城仲有 {allPending.length} 張單，但唔啱你架車型</div>
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

      {/* ── Double-confirm accept modal ── */}
      {confirmingBooking && (
        <div
          data-testid="accept-confirm-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: sp.md,
          }}
          onClick={() => setConfirmingBooking(null)}
        >
          <div
            style={{
              ...styles.cardElevated,
              maxWidth: 420,
              width: '100%',
              background: colors.surface,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, marginBottom: 4, fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>
              確認接單？
            </h3>
            <p style={{ margin: 0, marginBottom: sp.md, color: colors.textSecondary, fontSize: 13 }}>
              請核實訂單資料，確認後即無法取消。
            </p>

            <div style={{ ...styles.card, background: colors.background, marginBottom: sp.md, padding: sp.md }}>
              <div style={{ marginBottom: sp.sm }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 2 }}>起點</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {confirmingBooking.pickupAddress}
                </div>
              </div>
              <div style={{ marginBottom: sp.sm }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 2 }}>終點</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {confirmingBooking.dropoffAddress}
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: sp.sm,
                paddingTop: sp.sm,
                borderTop: `1px solid ${colors.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>車型</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginTop: 2 }}>
                    <VehicleTypeIcon type={confirmingBooking.vehicleTypeRequired} size={14} /> {VAN_TYPE_LABELS[confirmingBooking.vehicleTypeRequired]}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>件數</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginTop: 2 }}>
                    {confirmingBooking.totalLoadCount} 件
                  </div>
                </div>
                <div style={{ gridColumn: '1 / span 2' }}>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>預計費用</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: colors.brand, marginTop: 2 }}>
                    HK${confirmingBooking.estimatedPrice ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: sp.sm }}>
              <button
                data-testid="accept-cancel-btn"
                style={{
                  ...styles.secondaryBtn,
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 700,
                }}
                onClick={() => setConfirmingBooking(null)}
              >
                取消
              </button>
              <button
                data-testid="accept-confirm-btn"
                style={{
                  ...styles.primaryBtn,
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 15,
                  fontWeight: 700,
                  background: colors.brand,
                }}
                onClick={confirmAccept}
              >
                <IconCheck size={16} color={colors.white} /> 確認接單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({ booking, isOnline, isAccepting, onAccept }: {
  booking: Booking;
  isOnline: boolean;
  isAccepting: boolean;
  onAccept: () => void;
}) {
  return (
    <div style={styles.card}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.sm }}>
        <div style={{ ...styles.badge(colors.brandLight, colors.brand), display: 'flex', alignItems: 'center', gap: 4 }}>
          <VehicleTypeIcon type={booking.vehicleTypeRequired} size={16} /> {VAN_TYPE_LABELS[booking.vehicleTypeRequired]}
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted }}>
          {formatPickupTime(booking.pickupTime)}
        </div>
      </div>

      {/* Route */}
      <div style={{ marginBottom: sp.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.textMuted, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{booking.pickupAddress}</span>
        </div>
        <div style={{ width: 2, height: 12, background: colors.border, marginLeft: 4 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.brand, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{booking.dropoffAddress}</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, fontSize: 12, color: colors.textSecondary, marginBottom: sp.sm }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconPackage size={14} color={colors.textSecondary} /> {booking.totalLoadCount} 件</span>
        {booking.estimatedPrice && (
          <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 16, color: colors.brand }}>
            HK${booking.estimatedPrice}
          </span>
        )}
      </div>

      {/* Accept button */}
      <button
        style={{
          ...styles.primaryBtn,
          opacity: !isOnline || isAccepting ? 0.5 : 1,
          background: colors.brand,
        }}
        disabled={!isOnline || isAccepting}
        onClick={onAccept}
      >
        {isAccepting ? '接單中…' : <><IconCheck size={16} color={colors.white} /> 接單</>}
      </button>
    </div>
  );
}

// Need rd here
const rd = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 };
