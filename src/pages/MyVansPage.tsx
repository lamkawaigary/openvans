import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { subscribeToDriverVans, addVan, updateVan, deleteVan } from '../services/vans';
import { IconLargeTruck, IconCheck, IconArrowRight, IconLock, IconTrash, IconX } from '../components/Icon';
import { goOffline, subscribeToDriver } from '../services/drivers';
import type { Van, VehicleType } from '../types';
import { colors } from '../styles';
import { VAN_TYPE_LABELS, VAN_TYPE_EMOJI, VAN_TYPE_CAPACITY } from '../utils/helpers';

const VAN_TYPES: VehicleType[] = ['motorcycle', 'light', 'truck_5_5t'];

export default function MyVansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [driverOnlineVanId, setDriverOnlineVanId] = useState<string | null>(null);

  // Track driver online state
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDriver(user.uid, (state) => {
      setDriverOnlineVanId(state?.isOnline ? state.currentVanId : null);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/');
      return;
    }
    const unsub = subscribeToDriverVans(user.uid, (data) => {
      setVans(data);
      setLoading(false);
    });
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => { clearTimeout(timer); unsub(); };
  }, [user]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={styles.title}>我的貨車</span>
        <button style={styles.addBtn} onClick={() => setShowAdd(true)}>+ 新增</button>
      </div>

      {/* Van list */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.loading}>載入中…</div>
        ) : vans.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}><IconLargeTruck size={48} color={colors.textMuted} /></div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>還沒有貨車</div>
            <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '16px' }}>新增你的第一架貨車開始接單</div>
            <button style={styles.addVanBtn} onClick={() => setShowAdd(true)}>+ 新增貨車</button>
          </div>
        ) : (
          vans.map(van => (
            <VanCard
              key={van.id}
              van={van}
              isDriverOnline={driverOnlineVanId === van.id}
              onToggleAvailable={async () => {
                if (!user) return;
                if (driverOnlineVanId === van.id) {
                  // This van is online — go offline via proper flow
                  await goOffline(user.uid);
                  showNotification({ title: '已下線', body: '', type: 'info' });
                } else if (van.isAvailable) {
                  // Van is available but driver not on it — navigate to dashboard to go online
                  navigate('/dashboard');
                } else {
                  // Van not available (someone else or this driver offline for this van) — mark available
                  await updateVan(van.id, { isAvailable: true });
                  showNotification({ title: '已設為可接單', body: '', type: 'info' });
                }
              }}
              onDelete={async () => {
                if (!confirm('確定刪除此貨車？')) return;
                await deleteVan(van.id);
                showNotification({ title: '已刪除', body: '', type: 'info' });
              }}
            />
          ))
        )}
      </div>

      {/* Add Van Modal */}
      {showAdd && (
        <AddVanModal
          onClose={() => setShowAdd(false)}
          onAdd={async (data) => {
            if (!user) return;
            await addVan({ ...data, driverId: user.uid, isAvailable: true, isVerified: false });
            showNotification({ title: '貨車已新增', body: '', type: 'success' });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function VanCard({ van, isDriverOnline, onToggleAvailable, onDelete }: {
  van: Van;
  isDriverOnline: boolean;
  onToggleAvailable: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div>
          <div style={styles.plate}>{van.plateNumber}</div>
          <div style={styles.vanName}>{van.make} {van.model}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: van.isAvailable ? '#e8f5e9' : '#f5f5f5',
            color: van.isAvailable ? '#1b5e20' : '#9e9e9e',
          }}>
            {isDriverOnline ? '在線中' : van.isAvailable ? '可接單' : '休息中'}
          </span>
          {van.isVerified && <span style={{ fontSize: '16px' }}>✅</span>}
        </div>
      </div>

      <div style={styles.vanMeta}>
        <span>{VAN_TYPE_EMOJI[van.vehicleType]} {VAN_TYPE_LABELS[van.vehicleType]}</span>
        <span>載重 {van.capacityKg}kg</span>
        <span>容積 {van.capacityM3}m³</span>
      </div>

      <div style={styles.cardActions}>
        <button style={styles.toggleBtn} onClick={onToggleAvailable}>
          {isDriverOnline ? <><IconLock size={14} /> 設為休息</> : van.isAvailable ? <><IconArrowRight size={14} /> 前往上線</> : <><IconCheck size={14} /> 接受訂單</>}
        </button>
        <button style={styles.deleteBtn} onClick={onDelete}><IconTrash size={16} color={colors.error} /></button>
      </div>
    </div>
  );
}

function AddVanModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: Omit<Van, 'id' | 'driverId' | 'createdAt' | 'isAvailable' | 'isVerified'>) => void }) {
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVanType] = useState<VehicleType>('light');
  const [capacityKg, setCapacityKg] = useState('1000');
  const [capacityM3, setCapacityM3] = useState('5');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !make || !model) return;
    setLoading(true);
    try {
      await onAdd({ plateNumber, make, model, vehicleType, capacityKg: Number(capacityKg), capacityM3: Number(capacityM3) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={styles.modalOverlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>新增貨車</span>
          <button style={styles.modalClose} onClick={onClose}><IconX size={18} /></button>
        </div>
        <form style={styles.modalForm} onSubmit={handleSubmit}>
          <div style={styles.formField}>
            <label style={styles.formLabel}>車牌</label>
            <input style={styles.formInput} placeholder="e.g. TV 1234" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required />
          </div>
          <div style={styles.formField}>
            <label style={styles.formLabel}>品牌</label>
            <input style={styles.formInput} placeholder="e.g. Toyota" value={make} onChange={e => setMake(e.target.value)} required />
          </div>
          <div style={styles.formField}>
            <label style={styles.formLabel}>型號</label>
            <input style={styles.formInput} placeholder="e.g. HiAce" value={model} onChange={e => setModel(e.target.value)} required />
          </div>
          <div style={styles.formField}>
            <label style={styles.formLabel}>車型</label>
            <div style={styles.vanTypeGrid}>
              {VAN_TYPES.map(vt => (
                <div key={vt} style={vehicleType === vt ? styles.vanTypeActive : styles.vehicleType} onClick={() => setVanType(vt)}>
                  <span style={{ fontSize: '20px' }}>{VAN_TYPE_EMOJI[vt]}</span>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{VAN_TYPE_LABELS[vt]}</span>
                  <span style={{ fontSize: '11px', color: colors.textMuted }}>{VAN_TYPE_CAPACITY[vt].kg}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={styles.formField}>
              <label style={styles.formLabel}>載重 (kg)</label>
              <input style={styles.formInput} type="number" value={capacityKg} onChange={e => setCapacityKg(e.target.value)} />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>容積 (m³)</label>
              <input style={styles.formInput} type="number" value={capacityM3} onChange={e => setCapacityM3(e.target.value)} />
            </div>
          </div>
          <button type="submit" style={loading ? styles.btnDisabled : styles.btnSubmit} disabled={loading}>
            {loading ? '新增中…' : '確認新增'}
          </button>
        </form>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: colors.background, fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: '20px', paddingTop: 'env(safe-area-inset-top)' },
  header: { position: 'fixed' as const, top: 0, left: 0, right: 0, height: '56px', background: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 200, paddingTop: 'env(safe-area-inset-top)', boxShadow: `0 1px 3px ${colors.border}` },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  title: { fontSize: '16px', fontWeight: 700, color: colors.darkGrey },
  addBtn: { background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  list: { paddingTop: 'max(68px, calc(56px + env(safe-area-inset-top)))', paddingLeft: 16, paddingRight: 16, paddingBottom: 20, display: 'flex', flexDirection: 'column' as const, gap: 12 },
  loading: { textAlign: 'center' as const, padding: '40px', color: colors.textMuted },
  empty: { textAlign: 'center' as const, padding: '60px 20px' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px', opacity: 0.5 },
  addVanBtn: { background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' },
  card: { background: colors.surface, borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  plate: { fontSize: '18px', fontWeight: 800, color: colors.primary, fontFamily: 'monospace' },
  vanName: { fontSize: '14px', color: colors.textSecondary, marginTop: '2px' },
  vanMeta: { display: 'flex', gap: '12px', fontSize: '13px', color: colors.textSecondary, marginBottom: '12px' },
  cardActions: { display: 'flex', gap: '8px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` },
  toggleBtn: { flex: 1, background: colors.brandLight, color: colors.primaryBlue, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { background: '#ffebee', color: colors.error, border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 },
  modal: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: colors.surface, borderRadius: '20px 20px 0 0', zIndex: 400, maxHeight: '90vh', overflowY: 'auto' as const, paddingBottom: 'env(safe-area-inset-bottom)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px', borderBottom: `1px solid ${colors.border}` },
  modalTitle: { fontSize: '18px', fontWeight: 700 },
  modalClose: { background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: colors.textMuted },
  modalForm: { padding: '16px 20px 40px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  formField: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  formLabel: { fontSize: '13px', fontWeight: 600, color: colors.textSecondary },
  formInput: { width: '100%', padding: '12px 16px', border: `1.5px solid ${colors.border}`, borderRadius: '12px', fontSize: '15px', background: colors.surface, outline: 'none', boxSizing: 'border-box' as const },
  vanTypeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  vehicleType: { border: `1.5px solid ${colors.border}`, borderRadius: '12px', padding: '12px 8px', textAlign: 'center' as const, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' },
  vanTypeActive: { border: `2px solid ${colors.primaryBlue}`, borderRadius: '12px', padding: '12px 8px', textAlign: 'center' as const, cursor: 'pointer', background: colors.brandLight, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' },
  btnSubmit: { background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' },
  btnDisabled: { background: '#9ca3af', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'not-allowed', marginTop: '8px' },
};
