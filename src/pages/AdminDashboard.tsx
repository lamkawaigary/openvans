import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Booking, BookingStatus, Van, User } from '../types';
import {
  IconChart, IconClipboard, IconUsers, IconCar, IconDollar,
  IconTruck, IconCheck, IconClock, IconX, IconUser,
} from '../components/Icon';
import { colors, sp, rd } from '../styles';
import {
  HK_TOLL_CONFIGS,
  DEFAULT_TUNNEL_ROUTES,
  type TollConfig,
} from '../utils/tollConfig';

// ─── Tab Types ────────────────────────────────────────────────────────────
type TabType = 'overview' | 'bookings' | 'users' | 'vans' | 'billing' | 'tolls';

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
const STATUS_CONFIG: Record<BookingStatus, { label: React.ReactNode; color: string; bg: string }> = {
  pending:    { label: <><IconClock size={12} /> 待接單</>,    color: '#b45309', bg: '#fef3c7' },
  confirmed:  { label: <><IconCheck size={12} /> 已確認</>,    color: '#1d4ed8', bg: '#dbeafe' },
  in_progress:{ label: <><IconTruck size={12} /> 進行中</>,   color: '#065f46', bg: '#d1fae5' },
  completed:  { label: <><IconCheck size={12} /> 已完成</>,    color: '#374151', bg: '#f3f4f6' },
  cancelled:  { label: <><IconX size={12} /> 已取消</>,    color: '#991b1b', bg: '#fee2e2' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{ ...badge, color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

// ─── Billing Config Interface ────────────────────────────────────────────
interface BillingConfig {
  platformFeePercent: number;
  paymentProcessingFeePercent: number;
  minimumFares: Record<string, number>;
  perKmRates: Record<string, number>;
  surcharges: Record<string, number>;
  defaultTunnelFee: number;
  defaultBridgeFee: number;
  stairFeePerFloor: number;
  insuranceFee: number;
  assistantFee: number;
  extraStopFee: number;
}

const defaultBillingConfig: BillingConfig = {
  platformFeePercent: 15,
  paymentProcessingFeePercent: 2.5,
  minimumFares: {
    motorcycle: 25,
    light: 50,
    truck_5_5t: 90,
    truck_9_5t: 130,
    sedan: 45,
    van_7: 65,
  },
  perKmRates: {
    motorcycle: 2.5,
    light: 4.0,
    truck_5_5t: 6.0,
    truck_9_5t: 8.5,
    sedan: 3.5,
    van_7: 4.5,
  },
  surcharges: {
    immediate: 1.3,
    '4hour': 1.0,
    sameday: 0.9,
    scheduled: 0.85,
  },
  defaultTunnelFee: 30,
  defaultBridgeFee: 25,
  stairFeePerFloor: 20,
  insuranceFee: 20,
  assistantFee: 30,
  extraStopFee: 20,
};

// ─── Main Component ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Billing config state
  const [billingConfig, setBillingConfig] = useState<BillingConfig>(defaultBillingConfig);
  const [editingBilling, setEditingBilling] = useState(false);
  
  // Toll config state
  const [tollConfigs, setTollConfigs] = useState<Record<string, TollConfig>>(HK_TOLL_CONFIGS);
  const [editingToll, setEditingToll] = useState<string | null>(null);
  const [newTollFee, setNewTollFee] = useState<number>(0);

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
  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.finalPrice || b.estimatedPrice || 0), 0);

  // ── Toll Stats ──
  const activeTolls = Object.values(tollConfigs).filter(t => t.active);
  const totalTollRevenue = bookings.reduce((sum, b) => sum + (b.fareBreakdown?.tunnelFare || 0), 0);

  const tabs: { key: TabType; label: React.ReactNode }[] = [
    { key: 'overview', label: <><IconChart size={14} /> 總覽</> },
    { key: 'bookings', label: <><IconClipboard size={14} /> 訂單</> },
    { key: 'users', label: <><IconUsers size={14} /> 用戶</> },
    { key: 'vans', label: <><IconCar size={14} /> 車輛</> },
    { key: 'billing', label: <><IconDollar size={14} /> 計費</> },
    { key: 'tolls', label: '隧道' },
  ];

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

              <div style={{ ...statsGrid, marginTop: sp.md }}>
                <StatCard label="總收入" value={`HK$${totalRevenue}`} sub={`共 ${bookings.filter(b => b.status === 'completed').length} 單完成`} color="#065f46" />
                <StatCard label="隧道收入" value={`HK$${totalTollRevenue}`} sub={`共 ${activeTolls.length} 個隧道選項`} color="#b45309" />
                <StatCard label="總用戶" value={users.length} sub={`活躍 ${users.filter(u => u.isActive).length}`} color="#1d4ed8" />
                <StatCard label="總車輛" value={vans.length} sub={`可用 ${vans.filter(v => v.isAvailable).length}`} color="#6b21a8" />
              </div>

              <h2 style={{ ...sectionTitle, marginTop: sp.xl }}>最近待處理訂單</h2>
              {pending.length === 0 ? (
                <div style={emptyState}><IconCheck size={14} color={colors.success} /> 暫無待處理訂單</div>
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
                        {b.fareBreakdown?.tunnelFare ? ` · 隧道費: HK$${b.fareBreakdown.tunnelFare}` : ''}
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
                        {u.role === 'owner' ? <><IconTruck size={12} /> 司機</> : u.role === 'admin' ? '管理員' : <><IconUser size={12} /> 乘客</>}
                      </span>
                      <span style={{
                        ...badge,
                        color: u.isActive ? '#065f46' : '#991b1b',
                        background: u.isActive ? '#d1fae5' : '#fee2e2',
                        marginTop: 4,
                      }}>
                        {u.isActive ? <><IconCheck size={12} color={colors.success} /> 啟用</> : <><IconX size={12} color={colors.error} /> 停用</>}
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
                        {v.isVerified ? <><IconCheck size={12} color={colors.success} /> 已認證</> : <><IconClock size={12} color={colors.warning} /> 待認證</>}
                      </span>
                      <span style={{
                        ...badge,
                        color: v.isAvailable ? '#065f46' : '#991b1b',
                        background: v.isAvailable ? '#d1fae5' : '#fee2e2',
                        marginTop: 4,
                      }}>
                        {v.isAvailable ? <><IconCheck size={12} color={colors.success} /> 可用</> : <><IconX size={12} color={colors.error} /> 不可用</>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BILLING ── */}
          {activeTab === 'billing' && (
            <div style={section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.md }}>
                <h2 style={{ ...sectionTitle, marginTop: 0 }}>計費配置</h2>
                <button
                  style={editBtn}
                  onClick={() => setEditingBilling(!editingBilling)}
                >
                  {editingBilling ? '完成編輯' : '編輯'}
                </button>
              </div>

              {/* Platform Fees */}
              <div style={configCard}>
                <h3 style={configTitle}>平台費用</h3>
                <div style={configRow}>
                  <span style={configLabel}>平台服務費 (%)</span>
                  {editingBilling ? (
                    <input
                      type="number"
                      style={configInput}
                      value={billingConfig.platformFeePercent}
                      onChange={(e) => setBillingConfig({ ...billingConfig, platformFeePercent: Number(e.target.value) })}
                    />
                  ) : (
                    <span style={configValue}>{billingConfig.platformFeePercent}%</span>
                  )}
                </div>
                <div style={configRow}>
                  <span style={configLabel}>支付處理費 (%)</span>
                  {editingBilling ? (
                    <input
                      type="number"
                      style={configInput}
                      value={billingConfig.paymentProcessingFeePercent}
                      onChange={(e) => setBillingConfig({ ...billingConfig, paymentProcessingFeePercent: Number(e.target.value) })}
                    />
                  ) : (
                    <span style={configValue}>{billingConfig.paymentProcessingFeePercent}%</span>
                  )}
                </div>
              </div>

              {/* Base Fares by Vehicle Type */}
              <div style={configCard}>
                <h3 style={configTitle}>各車型最低收費 (HK$)</h3>
                {Object.entries(billingConfig.minimumFares).map(([type, fare]) => (
                  <div key={type} style={configRow}>
                    <span style={configLabel}>{type}</span>
                    {editingBilling ? (
                      <input
                        type="number"
                        style={configInput}
                        value={fare}
                        onChange={(e) => setBillingConfig({
                          ...billingConfig,
                          minimumFares: { ...billingConfig.minimumFares, [type]: Number(e.target.value) }
                        })}
                      />
                    ) : (
                      <span style={configValue}>HK${fare}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Per-km Rates */}
              <div style={configCard}>
                <h3 style={configTitle}>每公里收費率 (HK$)</h3>
                {Object.entries(billingConfig.perKmRates).map(([type, rate]) => (
                  <div key={type} style={configRow}>
                    <span style={configLabel}>{type}</span>
                    {editingBilling ? (
                      <input
                        type="number"
                        step="0.1"
                        style={configInput}
                        value={rate}
                        onChange={(e) => setBillingConfig({
                          ...billingConfig,
                          perKmRates: { ...billingConfig.perKmRates, [type]: Number(e.target.value) }
                        })}
                      />
                    ) : (
                      <span style={configValue}>HK${rate}/km</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Speed Surcharges */}
              <div style={configCard}>
                <h3 style={configTitle}>速度加乘</h3>
                {Object.entries(billingConfig.surcharges).map(([speed, mult]) => (
                  <div key={speed} style={configRow}>
                    <span style={configLabel}>{speed === 'immediate' ? '即時' : speed === '4hour' ? '4小時' : speed === 'sameday' ? '同日' : '預約'}</span>
                    {editingBilling ? (
                      <input
                        type="number"
                        step="0.05"
                        style={configInput}
                        value={mult}
                        onChange={(e) => setBillingConfig({
                          ...billingConfig,
                          surcharges: { ...billingConfig.surcharges, [speed]: Number(e.target.value) }
                        })}
                      />
                    ) : (
                      <span style={configValue}>{(mult * 100).toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Fees */}
              <div style={configCard}>
                <h3 style={configTitle}>附加費用</h3>
                <div style={configRow}>
                  <span style={configLabel}>樓梯費（每層）</span>
                  {editingBilling ? (
                    <input
                      type="number"
                      style={configInput}
                      value={billingConfig.stairFeePerFloor}
                      onChange={(e) => setBillingConfig({ ...billingConfig, stairFeePerFloor: Number(e.target.value) })}
                    />
                  ) : (
                    <span style={configValue}>HK${billingConfig.stairFeePerFloor}</span>
                  )}
                </div>
                <div style={configRow}>
                  <span style={configLabel}>保險費</span>
                  {editingBilling ? (
                    <input
                      type="number"
                      style={configInput}
                      value={billingConfig.insuranceFee}
                      onChange={(e) => setBillingConfig({ ...billingConfig, insuranceFee: Number(e.target.value) })}
                    />
                  ) : (
                    <span style={configValue}>HK${billingConfig.insuranceFee}</span>
                  )}
                </div>
                <div style={configRow}>
                  <span style={configLabel}>助手費</span>
                  {editingBilling ? (
                    <input
                      type="number"
                      style={configInput}
                      value={billingConfig.assistantFee}
                      onChange={(e) => setBillingConfig({ ...billingConfig, assistantFee: Number(e.target.value) })}
                    />
                  ) : (
                    <span style={configValue}>HK${billingConfig.assistantFee}</span>
                  )}
                </div>
                <div style={configRow}>
                  <span style={configLabel}>額外停靠站</span>
                  {editingBilling ? (
                    <input
                      type="number"
                      style={configInput}
                      value={billingConfig.extraStopFee}
                      onChange={(e) => setBillingConfig({ ...billingConfig, extraStopFee: Number(e.target.value) })}
                    />
                  ) : (
                    <span style={configValue}>HK${billingConfig.extraStopFee}/站</span>
                  )}
                </div>
              </div>

              {editingBilling && (
                <button style={saveBtn} onClick={() => {
                  // TODO: Save to Firebase
                  setEditingBilling(false);
                  alert('計費配置已更新（待實現 Firebase 儲存）');
                }}>
                  儲存配置
                </button>
              )}
            </div>
          )}

          {/* ── TOLLS ── */}
          {activeTab === 'tolls' && (
            <div style={section}>
              <h2 style={{ ...sectionTitle, marginTop: 0 }}>隧道及橋樑配置</h2>
              
              <div style={{ ...statsGrid, marginBottom: sp.lg }}>
                <StatCard label="活躍隧道/橋樑" value={activeTolls.length} color="#b45309" />
                <StatCard label="隧道總收入" value={`HK$${totalTollRevenue}`} color="#065f46" />
              </div>

              {/* Pre-defined Routes */}
              <h3 style={configTitle}>預設路線</h3>
              <div style={{ ...list, marginBottom: sp.lg }}>
                {DEFAULT_TUNNEL_ROUTES.map(route => (
                  <div key={route.id} style={listItem}>
                    <div style={listItemLeft}>
                      <div style={listItemTitle}>{route.name}</div>
                      <div style={listItemSub}>{route.description}</div>
                    </div>
                    <div style={listItemRight}>
                      <span style={{ ...badge, color: '#065f46', background: '#d1fae5' }}>
                        HK${route.estimatedCost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Individual Toll Configs */}
              <h3 style={configTitle}>個別隧道/橋樑收費</h3>
              {Object.values(tollConfigs).map(toll => (
                <div key={toll.id} style={configCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{toll.name} ({toll.shortName})</div>
                      <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{toll.description}</div>
                      <div style={{ marginTop: 4 }}>
                        <span style={{
                          ...badge,
                          color: toll.type === 'tunnel' ? '#1d4ed8' : toll.type === 'bridge' ? '#065f46' : '#b45309',
                          background: toll.type === 'tunnel' ? '#dbeafe' : toll.type === 'bridge' ? '#d1fae5' : '#fef3c7',
                        }}>
                          {toll.type === 'tunnel' ? '海底隧道' : toll.type === 'bridge' ? '橋樑' : '跨境'}
                        </span>
                        <span style={{
                          ...badge,
                          color: toll.active ? '#065f46' : '#991b1b',
                          background: toll.active ? '#d1fae5' : '#fee2e2',
                          marginLeft: 4,
                        }}>
                          {toll.active ? <><IconCheck size={12} color={colors.success} /> 啟用</> : <><IconX size={12} color={colors.error} /> 停用</>}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {editingToll === toll.id ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number"
                            style={{ ...configInput, width: 80 }}
                            value={newTollFee}
                            onChange={(e) => setNewTollFee(Number(e.target.value))}
                          />
                          <button style={smallBtn} onClick={() => {
                            setTollConfigs({
                              ...tollConfigs,
                              [toll.id]: { ...toll, fee: newTollFee }
                            });
                            setEditingToll(null);
                          }}>儲存</button>
                          <button style={{ ...smallBtn, background: '#fee2e2', color: '#991b1b' }} onClick={() => setEditingToll(null)}>取消</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: '#b45309' }}>HK${toll.fee}</span>
                          <button style={smallBtn} onClick={() => {
                            setEditingToll(toll.id);
                            setNewTollFee(toll.fee);
                          }}>編輯</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {toll.allowedVehicleTypes && (
                    <div style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                      適用車型：{toll.allowedVehicleTypes.join(', ')}
                    </div>
                  )}
                </div>
              ))}

              <button style={{ ...editBtn, marginTop: sp.md }} onClick={() => setEditingToll(editingToll ? null : 'new')}>
                {editingToll === 'new' ? '取消新增' : '+ 新增隧道/橋樑'}
              </button>
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
  overflowX: 'auto',
};

const tabBtn: React.CSSProperties = {
  padding: `${sp.sm}px ${sp.xs}px`,
  border: 'none',
  background: 'transparent',
  fontSize: 12,
  fontWeight: 600,
  color: colors.textMuted,
  cursor: 'pointer',
  borderRadius: rd.sm,
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
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

// Billing Config Styles
const configCard: React.CSSProperties = {
  background: '#fff',
  borderRadius: rd.md,
  padding: sp.md,
  marginBottom: sp.md,
  boxShadow: colors.shadowSm,
};

const configTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: colors.darkGrey,
  marginBottom: sp.sm,
};

const configRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${sp.xs}px 0`,
  borderBottom: `1px solid ${colors.lightGrey}`,
};

const configLabel: React.CSSProperties = {
  fontSize: 13,
  color: colors.darkGrey,
};

const configValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: colors.primary,
};

const configInput: React.CSSProperties = {
  width: 80,
  padding: '4px 8px',
  border: `1px solid ${colors.lightGrey}`,
  borderRadius: rd.sm,
  fontSize: 14,
  textAlign: 'right',
};

const editBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: rd.sm,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const smallBtn: React.CSSProperties = {
  padding: '4px 12px',
  background: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: rd.sm,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const saveBtn: React.CSSProperties = {
  width: '100%',
  padding: 14,
  background: '#065f46',
  color: '#fff',
  border: 'none',
  borderRadius: rd.md,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: sp.md,
};