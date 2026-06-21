import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSideMenu } from '../context/SideMenuContext';
import { subscribeToDriverBookings, acceptBooking, startBooking, completeBooking, BookingError } from '../services/bookings';
import { IconMail, IconLargeTruck, IconCheck, IconPackage, VehicleTypeIcon } from '../components/Icon';
import { subscribeToDriver, updateLocation, type DriverState } from '../services/drivers';
import { notifyBookingAccepted, notifyDriverEnRoute, notifyBookingCompleted } from '../services/notifications';
import type { Booking } from '../types';
import { colors, sp, styles } from '../styles';
import { formatDateTime, getStatusBadge, VAN_TYPE_EMOJI } from '../utils/helpers';
import OnlineToggle from '../components/OnlineToggle';
import { toast } from 'sonner';

// ─── Toast helpers ───────────────────────────────────────────────────────────
function showError(msg: string) {
  toast.error(msg, { duration: 4000 });
}
function showSuccess(msg: string) {
  toast.success(msg, { duration: 3000 });
}

export default function VanDashboard() {
  const { user } = useAuth();
  const { openMenu } = useSideMenu();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'new' | 'active' | 'completed'>('new');
  const [driverState, setDriverState] = useState<DriverState | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const locationWatchRef = useRef<number | null>(null);
  const lastLocationUpdateRef = useRef<number>(0);

  // Subscribe to driver online state
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDriver(user.uid, (state) => {
      setDriverState(state);
      setIsOnline(state?.isOnline ?? false);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to owner's bookings (all - filter by vehicle type when online)
  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/');
      return;
    }
    const unsub = subscribeToDriverBookings(user.uid, (data) => {
      setBookings(data);
      setLoading(false);
    });
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => { clearTimeout(timer); unsub(); };
  }, [user]);

  // Location tracking when online
  useEffect(() => {
    if (!isOnline || !user) {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastLocationUpdateRef.current < 15_000) return; // 15s debounce
        lastLocationUpdateRef.current = now;
        updateLocation(user.uid, pos.coords.latitude, pos.coords.longitude).catch(() => {
          // Silently fail - location update is non-critical
        });
      },
      () => {
        // Silently fail - location not available
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );

    locationWatchRef.current = watchId;

    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, [isOnline, user]);

  // Filter bookings by vehicle type when online, otherwise show all owned bookings
  const filteredBookings = isOnline && driverState?.vehicleType
    ? bookings.filter(b => b.vehicleTypeRequired === driverState.vehicleType)
    : bookings;

  const newBookings = filteredBookings.filter(b => b.status === 'pending');
  const activeBookings = filteredBookings.filter(b => ['confirmed', 'in_progress'].includes(b.status));
  const completedBookings = filteredBookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  const display = tab === 'new' ? newBookings : tab === 'active' ? activeBookings : completedBookings;

  const stats = {
    total: filteredBookings.length,
    pending: newBookings.length,
    active: activeBookings.length,
    completed: completedBookings.filter(b => b.status === 'completed').length,
  };

  const handleOnlineStateChange = (online: boolean) => {
    setIsOnline(online);
  };

  return (
    <div style={styles.pageContainer}>
      {/* ── Unified Top Bar (matches passenger UI) ── */}
      <div style={styles.headerBar}>
        <button style={styles.menuBtn} onClick={openMenu}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span style={styles.brand}>Open<span style={styles.brandAccent}>Vans</span></span>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Online Toggle (passenger-style card) ── */}
      <div style={{ padding: `${sp.md}px ${sp.md}px ${sp.xs}px` }}>
        <OnlineToggle onOnlineStateChange={handleOnlineStateChange} />
      </div>

      {/* ── Stats Cards (brand green style) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: sp.sm, padding: `0 ${sp.md}px ${sp.md}px` }}>
        <div style={{ ...styles.card, textAlign: 'center' as const }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: colors.warning }}>{stats.pending}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 2 }}>新訂單</div>
        </div>
        <div style={{ ...styles.card, textAlign: 'center' as const }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: colors.orange }}>{stats.active}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 2 }}>進行中</div>
        </div>
        <div style={{ ...styles.card, textAlign: 'center' as const }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: colors.success }}>{stats.completed}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, marginTop: 2 }}>已完成</div>
        </div>
      </div>

      {/* ── Tabs (design system) ── */}
      <div style={{ padding: `0 ${sp.md}px ${sp.sm}px` }}>
        <div style={styles.tabBar}>
          {([
            { key: 'new' as const, label: `新訂單 (${newBookings.length})` },
            { key: 'active' as const, label: `進行中 (${activeBookings.length})` },
            { key: 'completed' as const, label: `已完成 (${completedBookings.length})` },
          ]).map(t => (
            <div
              key={t.key}
              style={tab === t.key ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ padding: `0 ${sp.md}px ${sp.xxl}px`, display: 'flex', flexDirection: 'column' as const, gap: sp.sm }}>
        {!isOnline && (
          <div style={{ ...styles.card, textAlign: 'center' as const, background: colors.warningBg, color: '#92400E', fontWeight: 600, fontSize: 14 }}>
            上線後方可接單
          </div>
        )}
        {loading ? (
          <div style={styles.emptyState}>載入中…</div>
        ) : display.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>{tab === 'new' ? <IconMail size={48} color={colors.textMuted} /> : tab === 'active' ? <IconLargeTruck size={48} color={colors.textMuted} /> : <IconCheck size={48} color={colors.textMuted} />}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {tab === 'new' ? (isOnline ? '暫時沒有新訂單' : '請先上線') : tab === 'active' ? '沒有進行中訂單' : '暫時沒有已完成訂單'}
            </div>
          </div>
        ) : (
          display.map(b => (
            <DashboardCard
              key={b.id}
              booking={b}
              isDriver
              isOnline={isOnline}
              onAccept={() => {
                if (!user || !driverState?.currentVanId) return;
                acceptBooking(b.id, user.uid, driverState.currentVanId)
                  .then(() => {
                    showSuccess('已接受訂單！');
                    notifyBookingAccepted(b.renterId, b.id, user.name || '司機', VAN_TYPE_EMOJI[b.vehicleTypeRequired] + ' ' + b.vehicleTypeRequired).catch(() => {});
                  })
                  .catch((err: unknown) => {
                    if (err instanceof BookingError) showError(err.message);
                    else showError('接受訂單失敗');
                  });
              }}
              onStart={() => {
                if (!user) return;
                startBooking(b.id, user.uid)
                  .then(() => {
                    showSuccess('已開始送貨！');
                    notifyDriverEnRoute(b.renterId, b.id).catch(() => {});
                  })
                  .catch((err: unknown) => {
                    if (err instanceof BookingError) showError(err.message);
                    else showError('開始送貨失敗');
                  });
              }}
              onComplete={() => {
                if (!user) return;
                completeBooking(b.id, user.uid)
                  .then(() => {
                    showSuccess('已完成送貨！');
                    notifyBookingCompleted(b.renterId, b.id, b.estimatedPrice).catch(() => {});
                  })
                  .catch((err: unknown) => {
                    if (err instanceof BookingError) showError(err.message);
                    else showError('完成送貨失敗');
                  });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface DashboardCardProps {
  booking: Booking;
  isDriver?: boolean;
  isOnline?: boolean;
  onAccept?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
}

function DashboardCard({ booking, isDriver, isOnline, onAccept, onStart, onComplete }: DashboardCardProps) {
  const badge = getStatusBadge(booking.status);
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.sm }}>
        <span style={{ ...styles.badge(colors.warningBg, '#92400E'), ...styles.badge(booking.status === 'pending' ? colors.warningBg : booking.status === 'confirmed' ? colors.brandLight : booking.status === 'in_progress' ? colors.successBg : colors.errorBg, booking.status === 'pending' ? '#92400E' : booking.status === 'confirmed' ? colors.brand : booking.status === 'in_progress' ? '#065F46' : colors.error) }}>
          {badge.label}
        </span>
        <span style={{ fontSize: 12, color: colors.textMuted }}>{formatDateTime(booking.pickupTime)}</span>
      </div>

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.textMuted, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{booking.pickupAddress}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, marginBottom: sp.sm }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.brand, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{booking.dropoffAddress}</span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: sp.sm, fontSize: 12, color: colors.textSecondary, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><VehicleTypeIcon vehicleType={booking.vehicleTypeRequired} size={12} color={colors.textMuted} /> {booking.vehicleTypeRequired}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconPackage size={12} color={colors.textMuted} /> {booking.totalLoadCount} 件</span>
        {booking.estimatedPrice && (
          <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 16, color: colors.brand }}>
            HK${booking.estimatedPrice}
          </span>
        )}
      </div>

      {/* Actions */}
      {isDriver && (
        <div style={{ display: 'flex', gap: sp.xs, marginTop: sp.sm, paddingTop: sp.sm, borderTop: `1px solid ${colors.border}` }}>
          {booking.status === 'pending' && isOnline && (
            <button style={styles.primaryBtn} onClick={onAccept}><IconCheck size={14} /> 接受訂單</button>
          )}
          {booking.status === 'confirmed' && (
            <button style={{ ...styles.primaryBtn, background: colors.orange, color: '#fff' }} onClick={onStart}><IconLargeTruck size={14} /> 開始送貨</button>
          )}
          {booking.status === 'in_progress' && (
            <button style={{ ...styles.primaryBtn, background: colors.success, color: '#fff' }} onClick={onComplete}><IconCheck size={14} /> 完成送貨</button>
          )}
        </div>
      )}
    </div>
  );
}
