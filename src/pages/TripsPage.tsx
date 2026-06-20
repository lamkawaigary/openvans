import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToRenterBookings, subscribeToOwnerBookings } from '../services/bookings';
import type { Booking } from '../types';
import { IconLargeTruck, IconPackage } from '../components/Icon';
import { colors, sp, rd } from '../styles';
import OrderHistoryCard from '../components/OrderHistoryCard';
import NotificationBell from '../components/NotificationBell';

type FilterStatus = 'all' | 'active' | 'past';

export default function TripsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    let unsub: () => void;
    if (user.role === 'owner') {
      unsub = subscribeToOwnerBookings(user.uid, data => { setBookings(data); setLoading(false); });
    } else {
      unsub = subscribeToRenterBookings(user.uid, data => { setBookings(data); setLoading(false); });
    }
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => { clearTimeout(timer); unsub(); };
  }, [user]);

  const filtered = filter === 'all'
    ? bookings
    : filter === 'active'
    ? bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress')
    : bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  const counts = {
    all: bookings.length,
    active: bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    past: bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).length,
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.closeBtn} onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span style={styles.title}>你的柯打</span>
        <NotificationBell />
      </div>

      {/* Filter pills */}
      <div style={styles.filterPills}>
        {([
          { key: 'all', label: '全部' },
          { key: 'active', label: '進行中' },
          { key: 'past', label: '過往' },
        ] as { key: FilterStatus; label: string }[]).map(tab => (
          <div
            key={tab.key}
            style={filter === tab.key ? styles.filterPillActive : styles.filterPill}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span style={{
                ...styles.filterPillCount,
                background: filter === tab.key ? colors.primary : colors.white,
                color: filter === tab.key ? colors.brand : colors.textMuted,
              }}>
                {counts[tab.key]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* List */}
      <div style={styles.listContent}>
        {loading ? (
          <div style={styles.loading}>載入中…</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>{user?.role === 'owner' ? <IconLargeTruck size={48} color={colors.textMuted} /> : <IconPackage size={48} color={colors.textMuted} />}</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              {user?.role === 'owner'
                ? '暫時沒有車單'
                : '暫時沒有柯打'}
            </div>
            <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: sp.lg }}>
              {user?.role === 'owner' ? '等待客戶下單' : '發布需求，搵司機接單！'}
            </div>
            {user?.role === 'renter' && (
              <button style={styles.publishBtn} onClick={() => navigate('/publish')}>
                發布需求
              </button>
            )}
            {user?.role === 'owner' && (
              <button style={styles.publishBtn} onClick={() => navigate('/dashboard')}>
                查看 Dashboard →
              </button>
            )}
          </div>
        ) : (
          filtered.map(b => (
            <OrderHistoryCard
              key={b.id}
              booking={b}
              onClick={() => navigate(`/trips/${b.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: `linear-gradient(180deg, ${colors.brandLight} 0%, ${colors.background} 240px)`,
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative' as const,
  },
  header: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, height: 56,
    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `0 ${sp.md}`, paddingTop: 'env(safe-area-inset-top)', zIndex: 200,
    borderBottom: `1px solid ${colors.border}`,
  },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: 700, color: colors.darkGrey },
  filterPills: {
    display: 'flex', gap: sp.xs, padding: `${sp.sm}px ${sp.md}`,
    background: 'transparent',
    marginTop: 56,
  },
  filterPillActive: {
    padding: '5px 14px', borderRadius: rd.full, fontSize: 13, fontWeight: 700,
    background: colors.brand, color: colors.primary, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    display: 'flex', alignItems: 'center', gap: 4,
    boxShadow: '0 2px 6px rgba(195, 234, 79, 0.4)',
  },
  filterPill: {
    padding: '5px 14px', borderRadius: rd.full, fontSize: 13, fontWeight: 600,
    background: colors.lightGrey, color: colors.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  filterPillCount: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700, minWidth: 18,
  },
  listContent: { padding: `${sp.sm}px ${sp.md}px` },
  loading: { textAlign: 'center' as const, padding: `${sp.xxl} 0`, color: colors.textMuted },
  empty: { textAlign: 'center' as const, padding: `${sp.xxl} ${sp.lg}` },
  emptyIcon: { fontSize: 56, marginBottom: sp.md, opacity: 0.5 },
  publishBtn: {
    background: colors.primaryBlue, color: colors.white, border: 'none',
    borderRadius: rd.md, padding: `${sp.sm}px ${sp.xl}`, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
  },
};