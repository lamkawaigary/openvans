import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToOwnerBookings, acceptBooking, startBooking, completeBooking } from '../services/bookings';
import type { Booking } from '../types';
import { colors } from '../styles';
import { formatDateTime, getStatusBadge, VAN_TYPE_EMOJI } from '../utils/helpers';

export default function VanDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'new' | 'active' | 'completed'>('new');

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      navigate('/');
      return;
    }
    const unsub = subscribeToOwnerBookings(user.uid, (data) => {
      setBookings(data);
      setLoading(false);
    });
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => { clearTimeout(timer); unsub(); };
  }, [user]);

  const newBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status));
  const completedBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  const display = tab === 'new' ? newBookings : tab === 'active' ? activeBookings : completedBookings;

  const stats = {
    total: bookings.length,
    pending: newBookings.length,
    active: activeBookings.length,
    completed: completedBookings.filter(b => b.status === 'completed').length,
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
        <span style={styles.title}>司機 Dashboard</span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{stats.pending}</div>
          <div style={styles.statLabel}>新訂單</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{stats.active}</div>
          <div style={styles.statLabel}>進行中</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{stats.completed}</div>
          <div style={styles.statLabel}>已完成</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {([
          { key: 'new', label: `新訂單 (${newBookings.length})` },
          { key: 'active', label: `進行中 (${activeBookings.length})` },
          { key: 'completed', label: `已完成 (${completedBookings.length})` },
        ] as const).map(t => (
          <div
            key={t.key}
            style={tab === t.key ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.loading}>載入中…</div>
        ) : display.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>{tab === 'new' ? '📭' : tab === 'active' ? '🚛' : '✅'}</div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{tab === 'new' ? '暫時沒有新訂單' : tab === 'active' ? '沒有進行中訂單' : '暫時沒有已完成訂單'}</div>
          </div>
        ) : (
          display.map(b => (
            <DashboardCard
              key={b.id}
              booking={b}
              isOwner
              onAccept={() => { if (user) acceptBooking(b.id, user.uid, '').catch(console.error); }}
              onStart={() => { if (user) startBooking(b.id, user.uid).catch(console.error); }}
              onComplete={() => { if (user) completeBooking(b.id, user.uid).catch(console.error); }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DashboardCard({ booking, isOwner, onAccept, onStart, onComplete }: {
  booking: Booking;
  isOwner?: boolean;
  onAccept?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
}) {
  const badge = getStatusBadge(booking.status);
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <span style={{ ...styles.badge, background: badge.bg, color: badge.text }}>{badge.label}</span>
        <span style={styles.time}>{formatDateTime(booking.pickupTime)}</span>
      </div>

      <div style={styles.routeRow}><div style={styles.dot} /><span>{booking.pickupAddress}</span></div>
      <div style={styles.routeRow}><div style={{ ...styles.dot, background: colors.primaryBlue }} /><span>{booking.dropoffAddress}</span></div>

      <div style={styles.meta}>
        <span>{VAN_TYPE_EMOJI[booking.vehicleTypeRequired]} 需{booking.vehicleTypeRequired}</span>
        <span>📦 {booking.totalLoadCount} 件</span>
        {booking.estimatedPrice && (
          <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '16px', color: colors.primaryBlue }}>
            HK${booking.estimatedPrice}
          </span>
        )}
      </div>

      {isOwner && (
        <div style={styles.actions}>
          {booking.status === 'pending' && (
            <button style={styles.acceptBtn} onClick={onAccept}>
              ✓ 接受訂單
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button style={styles.startBtn} onClick={onStart}>
              🚛 開始送貨
            </button>
          )}
          {booking.status === 'in_progress' && (
            <button style={styles.completeBtn} onClick={onComplete}>
              ✅ 完成送貨
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: colors.background, fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: '20px' },
  header: { position: 'fixed' as const, top: 0, left: 0, right: 0, height: '56px', background: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', paddingTop: 'env(safe-area-inset-top)', zIndex: 200, boxShadow: `0 1px 3px ${colors.border}` },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  title: { fontSize: '16px', fontWeight: 700, color: colors.darkGrey },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 'max(68px, calc(56px + env(safe-area-inset-top)))', paddingLeft: 16, paddingRight: 16, paddingBottom: 12 },
  statCard: { background: colors.surface, borderRadius: '16px', padding: '16px 12px', textAlign: 'center' as const },
  statNum: { fontSize: '28px', fontWeight: 800, color: colors.primaryBlue },
  statLabel: { fontSize: '12px', color: colors.textSecondary, fontWeight: 600, marginTop: '2px' },
  tabs: { display: 'flex', gap: '4px', padding: '4px', background: colors.border, borderRadius: '12px', margin: '0 16px' },
  tab: { flex: 1, padding: '8px 4px', textAlign: 'center' as const, fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', color: colors.textSecondary },
  tabActive: { flex: 1, padding: '8px 4px', textAlign: 'center' as const, fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', background: colors.surface, color: colors.textPrimary, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  list: { padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  loading: { textAlign: 'center' as const, padding: '40px', color: colors.textMuted },
  empty: { textAlign: 'center' as const, padding: '40px 20px' },
  emptyIcon: { fontSize: '40px', marginBottom: '8px', opacity: 0.5 },
  card: { background: colors.surface, borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
  time: { fontSize: '12px', color: colors.textSecondary },
  routeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '13px', fontWeight: 500 },
  dot: { width: '10px', height: '10px', borderRadius: '50%', background: colors.textMuted, flexShrink: 0 },
  meta: { display: 'flex', gap: '10px', fontSize: '12px', color: colors.textSecondary, marginTop: '8px', alignItems: 'center' },
  actions: { display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` },
  acceptBtn: { flex: 1, background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  startBtn: { flex: 1, background: '#ff9800', color: 'white', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  completeBtn: { flex: 1, background: colors.success, color: 'white', border: 'none', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
};
