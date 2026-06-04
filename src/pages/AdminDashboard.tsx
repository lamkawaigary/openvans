import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Booking, BookingStatus, Van, User } from '../types';
import { colors, sp, rd } from '../styles';

// ─── Stat Card ───────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div style={{ ...card, borderLeft: `4px solid ${color}` }}>
      <div style={cardLabel}>{label}</div>
      <div style={{ ...cardValue, color }}>{value}</div>
      {sub && <div style={cardSub}>{sub}</div>}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: '⏳ 待接單',    color: '#b45309', bg: '#fef3c7' },
  confirmed:  { label: '✅ 已確認',    color: '#1d4ed8', bg: '#dbeafe' },
  in_progress:{ label: '🚚 進行中',   color: '#065f46', bg: '#d1fae5' },
  completed:  { label: '✔️ 已完成',    color: '#374151', bg: '#f3f4f6' },
  cancelled:  { label: '✖️ 已取消',    color: '#991b1b', bg: '#fee2e2' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{ ...badge, color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'users' | 'vans'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load bookings
      const bq = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const bsnap = await getDocs(bq);
      setBookings(bsnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));

      // Load users
      const uq = query(collection(db, 'users'));
      const usnap = await getDocs(uq);
      setUsers(usnap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));

      // Load vans
      const vq = query(collection(db, 'vans'));
      const vsnap = await getDocs(vq);
      setVans(vsnap.docs.map(d => ({ id: d.id, ...d.data() } as Van)));
    } catch (e) {
      console.error('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Stats ──
  const today = new Date().toDateString();
  const todayBookings = bookings.filter(b => new Date(b.createdAt).toDateString() === today);
  const pending = bookings.filter(b => b.status === 'pending');
  const inProgress = bookings.filter(b => b.status === 'in_progress');
  const completedToday = bookings.filter(b => b.status === 'completed' && b.completedAt && new Date(b.completedAt).toDateString() === today);
  const revenueToday = completedToday.reduce((sum, b) => sum + (b.finalPrice || b.estimatedPrice || 0), 0);

  const tabs = [
    { key: 'overview', label: '📊 總覽' },
    { key: 'bookings', label: '📋 訂單' },
    { key: 'users', label: '👥 用戶' },
    { key: 'vans', label: '🚐 車輛' },
  ] as const;

  return (
    <div style={page}>
      {/* Header */}
      <div style={adminHeader}>
        <button style={closeBtn} onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span style={adminTitle}>管理後台</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Tab Nav */}
      <div style={tabNav}>
        {tabs.map(t => (
          <button
            key={t.key}
            style={{ ...tabBtn, ...(activeTab === t.key ? tabBtnActive : {}) }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={loadingWrap}>
          <div style={spinner} />
          <p style={{ color: colors.textMuted, marginTop: 12 }}>載入中...</p>
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div style={section}>
              <h2 style={sectionTitle}>關鍵指標</h2>
              <div style={statsGrid}>
                <StatCard label="今日訂單" value={todayBookings.length} sub={`共 ${bookings.length} 張訂單`} color="#1d4ed8" />
                <StatCard label="待接單" value={pending.length} sub="需要司機確認" color="#b45309" />
                <StatCard label="進行中" value={inProgress.length} sub="正在服務" color="#065f46" />
                <StatCard label="今日收入" value={`HK$${revenueToday}`} sub={`完成 ${completedToday.length} 單`} color="#6b21a8" />
              </div>

              <h2 style={{ ...sectionTitle, marginTop: sp.xl }}>最近待處理訂單</h2>
              {pending.length === 0 ? (
                <div style={emptyState}>✅ 暫無待處理訂單</div>
              ) : (
                <div style={list}>
                  {pending.slice(0, 5).map(b => (
                    <div key={b.id} style={listItem} onClick={() => navigate(`/trips/${b.id}`)}>
                      <div style={listItemLeft}>
                        <div style={listItemTitle}>{b.pickupAddress} → {b.dropoffAddress}</div>
                        <div style={listItemSub}>
                          {b.vehicleTypeRequired} · {new Date(b.pickupTime).toLocaleString('zh-HK')} · {b.totalLoadCount}件行李
                        </div>
                      </div>
                      <div style={listItemRight}>
                        <StatusBadge status={b.status} />
                        <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                          {b.estimatedPrice ? `HK$${b.estimatedPrice}` : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {activeTab === 'bookings' && (
            <div style={section}>
              <h2 style={sectionTitle}>所有訂單 ({bookings.length})</h2>
              <div style={list}>
                {bookings.map(b => (
                  <div key={b.id} style={listItem} onClick={() => navigate(`/trips/${b.id}`)}>
                    <div style={listItemLeft}>
                      <div style={listItemTitle}>{b.pickupAddress} → {b.dropoffAddress}</div>
                      <div style={listItemSub}>
                        {b.vehicleTypeRequired} · {new Date(b.createdAt).toLocaleString('zh-HK')}
                      </div>
                    </div>
                    <div style={listItemRight}>
                      <StatusBadge status={b.status} />
                      <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                        {b.estimatedPrice ? `HK$${b.estimatedPrice}` : b.finalPrice ? `HK$${b.finalPrice}` : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div style={section}>
              <h2 style={sectionTitle}>用戶列表 ({users.length})</h2>
              <div style={statsGrid}>
                <StatCard label="總用戶" value={users.length} color="#1d4ed8" />
                <StatCard label="活躍用戶" value={users.filter(u => u.isActive).length} color="#065f46" />
              </div>
              <div style={{ ...list, marginTop: sp.md }}>
                {users.map(u => (
                  <div key={u.uid} style={listItem}>
                    <div style={listItemLeft}>
                      <div style={listItemTitle}>{u.name || '未命名'}</div>
                      <div style={listItemSub}>{u.email || '—'} · {u.phone}</div>
                    </div>
                    <div style={listItemRight}>
                      <span style={{
                        ...badge,
                        color: u.role === 'owner' ? '#065f46' : '#1d4ed8',
                        background: u.role === 'owner' ? '#d1fae5' : '#dbeafe',
                      }}>
                        {u.role === 'owner' ? '🚚 司機' : '👤 乘客'}
                      </span>
                      <span style={{
                        ...badge,
                        color: u.isActive ? '#065f46' : '#991b1b',
                        background: u.isActive ? '#d1fae5' : '#fee2e2',
                        marginTop: 4,
                      }}>
                        {u.isActive ? '✅ 啟用' : '❌ 停用'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VANS ── */}
          {activeTab === 'vans' && (
            <div style={section}>
              <h2 style={sectionTitle}>車輛列表 ({vans.length})</h2>
              <div style={statsGrid}>
                <StatCard label="總車輛" value={vans.length} color="#1d4ed8" />
                <StatCard label="可用車輛" value={vans.filter(v => v.isAvailable).length} color="#065f46" />
                <StatCard label="已認證" value={vans.filter(v => v.isVerified).length} color="#6b21a8" />
              </div>
              <div style={{ ...list, marginTop: sp.md }}>
                {vans.map(v => (
                  <div key={v.id} style={listItem}>
                    <div style={listItemLeft}>
                      <div style={listItemTitle}>{v.make} {v.model} ({v.plateNumber})</div>
                      <div style={listItemSub}>
                        {v.vehicleType} · {v.capacityKg}kg · {v.capacityM3}m³
                      </div>
                    </div>
                    <div style={listItemRight}>
                      <span style={{
                        ...badge,
                        color: v.isVerified ? '#065f46' : '#b45309',
                        background: v.isVerified ? '#d1fae5' : '#fef3c7',
                      }}>
                        {v.isVerified ? '✅ 已認證' : '⏳ 待認證'}
                      </span>
                      <span style={{
                        ...badge,
                        color: v.isAvailable ? '#065f46' : '#991b1b',
                        background: v.isAvailable ? '#d1fae5' : '#fee2e2',
                        marginTop: 4,
                      }}>
                        {v.isAvailable ? '✅ 可用' : '❌ 不可用'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  paddingBottom: 40,
};

const tabNav: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: `${sp.sm}px ${sp.md}px`,
  background: '#fff',
  borderBottom: `1px solid ${colors.lightGrey}`,
  position: 'sticky',
  top: 56,
  zIndex: 10,
};

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: `${sp.sm}px ${sp.xs}px`,
  border: 'none',
  background: 'transparent',
  fontSize: 13,
  fontWeight: 600,
  color: colors.textMuted,
  cursor: 'pointer',
  borderRadius: rd.sm,
  transition: 'all 0.2s',
};

const tabBtnActive: React.CSSProperties = {
  background: colors.primary,
  color: '#fff',
};

const section: React.CSSProperties = {
  padding: sp.md,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: colors.darkGrey,
  marginBottom: sp.md,
  marginTop: sp.lg,
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: sp.sm,
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: rd.md,
  padding: `${sp.md}px ${sp.md}px`,
  boxShadow: colors.shadowSm,
};

const cardLabel: React.CSSProperties = {
  fontSize: 12,
  color: colors.textMuted,
  fontWeight: 500,
  marginBottom: 4,
};

const cardValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  lineHeight: 1.1,
};

const cardSub: React.CSSProperties = {
  fontSize: 11,
  color: colors.textMuted,
  marginTop: 4,
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};

const list: React.CSSProperties = {
  background: '#fff',
  borderRadius: rd.md,
  overflow: 'hidden',
  boxShadow: colors.shadowSm,
};

const listItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${sp.md}px`,
  borderBottom: `1px solid ${colors.lightGrey}`,
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const listItemLeft: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const listItemRight: React.CSSProperties = {
  marginLeft: sp.md,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  flexShrink: 0,
};

const listItemTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.darkGrey,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const listItemSub: React.CSSProperties = {
  fontSize: 11,
  color: colors.textMuted,
  marginTop: 2,
};

const emptyState: React.CSSProperties = {
  textAlign: 'center',
  padding: `${sp.xl}px`,
  color: colors.textMuted,
  fontSize: 14,
};

const loadingWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 60,
};

const spinner: React.CSSProperties = {
  width: 32,
  height: 32,
  border: `3px solid ${colors.lightGrey}`,
  borderTopColor: colors.primary,
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const adminHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${sp.md}px`,
  background: colors.white,
  borderBottom: `1px solid ${colors.lightGrey}`,
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
};

const adminTitle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: colors.darkGrey,
};

const closeBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: rd.sm,
};