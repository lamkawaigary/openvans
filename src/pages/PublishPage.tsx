import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { createBooking } from '../services/bookings';
import type { LoadType, VehicleType } from '../types';
import { colors } from '../styles';
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPE_CAPACITY } from '../utils/helpers';
import { IconMapPin, IconArrowUp, IconLargeTruck, IconTruck, IconMotorcycle, IconPackage, IconLuggage, IconShip, IconDocument, IconInfo } from '../components/Icon';

function VehicleTypeIcon({ type, size = 28 }: { type: VehicleType; size?: number }) {
  switch (type) {
    case 'motorcycle': return <IconMotorcycle size={size} color={colors.textPrimary} />;
    case 'light': return <IconTruck size={size} color={colors.textPrimary} />;
    case 'truck_5_5t': return <IconLargeTruck size={size} color={colors.textPrimary} />;
    default: return <IconTruck size={size} color={colors.textPrimary} />;
  }
}

type Step = 'route' | 'load' | 'confirm';

const VEHICLE_TYPES: VehicleType[] = ['motorcycle', 'light', 'truck_5_5t'];
const LOAD_TYPES: { type: LoadType; label: string; Icon: typeof IconPackage }[] = [
  { type: 'small', label: '小件', Icon: IconPackage },
  { type: 'medium', label: '中件', Icon: IconLuggage },
  { type: 'large', label: '大件', Icon: IconShip },
];

export default function PublishPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [step, setStep] = useState<Step>('route');
  const [loading, setLoading] = useState(false);

  // Route
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupTime, setPickupTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  // Load
  const [vehicleType, setVehicleType] = useState<VehicleType>('light');
  const [loads, setLoads] = useState<Record<LoadType, number>>({
    small: 0,
    medium: 0,
    large: 0,
  });
  const [loadDescription, setLoadDescription] = useState('');

  const totalLoadCount = (Object.values(loads) as number[]).reduce((a, b) => a + b, 0);

  const handleSubmit = async () => {
    if (!user) {
      showNotification({ title: '請先登入', body: '登入後才能發布需求', type: 'warning' });
      navigate('/login');
      return;
    }
    if (!pickupAddress || !dropoffAddress || totalLoadCount === 0) {
      showNotification({ title: '資料不完整', body: '請填寫所有必填欄位', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        renterId: user.uid,
        pickupAddress,
        pickupLat: null as number | null,
        pickupLng: null as number | null,
        dropoffAddress,
        dropoffLat: null as number | null,
        dropoffLng: null as number | null,
        waypoints: [] as { address: string; lat?: number; lng?: number }[],
        loads: (Object.entries(loads) as [LoadType, number][])
          .filter(([, count]) => count > 0)
          .map(([type, count]) => ({ type, count })),
        totalLoadCount,
        loadDescription,
        vehicleTypeRequired: vehicleType,
        pickupTime,
        notes: '',
      };

      const id = await createBooking(bookingData as Parameters<typeof createBooking>[0]);
      showNotification({ title: '發布成功！', body: '司機很快會看到你的需求', type: 'success' });
      navigate(`/trips/${id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showNotification({ title: '發布失敗', body: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => {
          if (step === 'route') navigate(-1);
          else setStep(step === 'confirm' ? 'load' : 'route');
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ ...styles.title }}>發布貨運需求</span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Step indicator */}
      <div style={styles.steps}>
        {(['route', 'load', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} style={styles.stepRow}>
            <div style={{
              ...styles.stepDot,
              background: step === s ? colors.primaryBlue : '#9ca3af',
            }}>{i + 1}</div>
            <div style={{ ...styles.stepLabel, color: step === s ? colors.primaryBlue : '#9ca3af' }}>
              {s === 'route' ? '路線' : s === 'load' ? '货物' : '確認'}
            </div>
            {i < 2 && <div style={styles.stepLine} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {step === 'route' && (
          <div style={styles.section}>
            <div style={styles.field}>
              <label style={styles.label}><IconMapPin size={16} color={colors.textSecondary} /> 取貨地點</label>
              <input style={styles.input} placeholder="輸入取貨地址" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}><IconMapPin size={16} color={colors.textSecondary} style={{ transform: 'rotate(180deg)' }} /> 送貨地點</label>
              <input style={styles.input} placeholder="輸入送貨地址" value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}><IconArrowUp size={16} color={colors.textSecondary} /> 取貨時間</label>
              <input style={styles.input} type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
            </div>
          </div>
        )}

        {step === 'load' && (
          <div style={styles.section}>
            {/* Vehicle type */}
            <div style={styles.field}>
              <label style={styles.label}><IconLargeTruck size={16} color={colors.textSecondary} /> 需要的貨車類型</label>
              <div style={styles.vanGrid}>
                {VEHICLE_TYPES.map(vt => (
                  <div key={vt} style={vehicleType === vt ? styles.vanCardActive : styles.vanCard} onClick={() => setVehicleType(vt)}>
                    <VehicleTypeIcon type={vt} size={28} />
                    <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '4px' }}>{VEHICLE_TYPE_LABELS[vt]}</div>
                    <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
                      {VEHICLE_TYPE_CAPACITY[vt].kg} | {VEHICLE_TYPE_CAPACITY[vt].m3}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Load count */}
            <div style={styles.field}>
              <label style={styles.label}><IconPackage size={16} color={colors.textSecondary} /> 货物数量（点击 +/- 调整）</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {LOAD_TYPES.map(({ type, label, Icon }) => (
                  <div key={type} style={styles.loadRow}>
                    <Icon size={20} color={colors.textPrimary} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '14px' }}>{label}</span>
                    <div style={styles.stepper}>
                      <button style={styles.stepBtn} onClick={() => setLoads(p => ({ ...p, [type]: Math.max(0, p[type] - 1) }))}>−</button>
                      <span style={styles.stepNum}>{loads[type]}</span>
                      <button style={styles.stepBtn} onClick={() => setLoads(p => ({ ...p, [type]: p[type] + 1 }))}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.totalRow}><IconPackage size={16} color={colors.primaryBlue} /> 共 {totalLoadCount} 件货物</div>
            </div>

            {/* Description */}
            <div style={styles.field}>
              <label style={styles.label}><IconDocument size={16} color={colors.textSecondary} /> 货物描述（可选）</label>
              <input style={styles.input} placeholder="例如：傢俬、搬屋、裝修材料..." value={loadDescription} onChange={e => setLoadDescription(e.target.value)} />
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div style={styles.section}>
            <div style={styles.confirmCard}>
              <div style={styles.confirmTitle}><IconDocument size={16} color={colors.textSecondary} /> 貨運需求摘要</div>
              <div style={styles.confirmRow}>
                <span style={styles.confirmLabel}>取貨地點</span>
                <span style={styles.confirmValue}>{pickupAddress}</span>
              </div>
              <div style={styles.confirmRow}>
                <span style={styles.confirmLabel}>送貨地點</span>
                <span style={styles.confirmValue}>{dropoffAddress}</span>
              </div>
              <div style={styles.confirmRow}>
                <span style={styles.confirmLabel}>取貨時間</span>
                <span style={styles.confirmValue}>{pickupTime.replace('T', ' ')}</span>
              </div>
              <div style={styles.confirmRow}>
                <span style={styles.confirmLabel}>貨車類型</span>
                <span style={styles.confirmValue}><VehicleTypeIcon type={vehicleType} size={16} /> {VEHICLE_TYPE_LABELS[vehicleType]}</span>
              </div>
              <div style={styles.confirmRow}>
                <span style={styles.confirmLabel}>货物数量</span>
                <span style={styles.confirmValue}><IconPackage size={16} color={colors.textPrimary} /> {totalLoadCount} 件</span>
              </div>
              {loadDescription && (
                <div style={styles.confirmRow}>
                  <span style={styles.confirmLabel}>货物描述</span>
                  <span style={styles.confirmValue}>{loadDescription}</span>
                </div>
              )}
            </div>
            <div style={styles.tip}><IconInfo size={16} color={colors.primaryBlue} /> 你的需求發布後，附近司機會收到通知並可接單。</div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={styles.bottomCta}>
        {step !== 'route' && (
          <button style={styles.btnBack} onClick={() => setStep(step === 'confirm' ? 'load' : 'route')}>
            上一步
          </button>
        )}
        {step !== 'confirm' ? (
          <button
            style={styles.btnNext}
            onClick={() => setStep(step === 'route' ? 'load' : 'confirm')}
            disabled={step === 'route' && (!pickupAddress || !dropoffAddress)}
          >
            下一步
          </button>
        ) : (
          <button style={loading ? styles.btnDisabled : styles.btnPrimary} disabled={loading} onClick={handleSubmit}>
            {loading ? '發布中…' : '確認發布'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: colors.background, fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: '100px' },
  header: { position: 'fixed' as const, top: 0, left: 0, right: 0, height: '56px', background: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', paddingTop: 'env(safe-area-inset-top)', zIndex: 200, boxShadow: `0 1px 3px ${colors.border}` },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  title: { fontSize: '16px', fontWeight: 700, color: colors.darkGrey },
  steps: { marginTop: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: 0 },
  stepRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  stepDot: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.darkGrey, fontSize: '13px', fontWeight: 700, flexShrink: 0 },
  stepLabel: { fontSize: '13px', fontWeight: 600 },
  stepLine: { width: '40px', height: '2px', background: colors.border, margin: '0 8px' },
  content: { padding: '0 16px' },
  section: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '14px', fontWeight: 700, color: colors.textPrimary },
  input: { width: '100%', padding: '12px 16px', border: `1.5px solid ${colors.border}`, borderRadius: '12px', fontSize: '15px', background: colors.surface, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' as const },
  vanGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  vanCard: { border: `1.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 8px', textAlign: 'center' as const, cursor: 'pointer', background: colors.surface },
  vanCardActive: { border: `2px solid ${colors.primaryBlue}`, borderRadius: '12px', padding: '14px 8px', textAlign: 'center' as const, cursor: 'pointer', background: colors.brandLight },
  loadRow: { display: 'flex', alignItems: 'center', gap: '12px', background: colors.surface, borderRadius: '12px', padding: '12px 16px', border: `1px solid ${colors.border}` },
  stepper: { display: 'flex', alignItems: 'center', gap: '12px', background: colors.background, borderRadius: '8px', padding: '4px 8px' },
  stepBtn: { width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: colors.primaryBlue, color: colors.darkGrey, fontSize: '18px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  stepNum: { fontSize: '18px', fontWeight: 700, minWidth: '24px', textAlign: 'center' as const },
  totalRow: { textAlign: 'center' as const, fontWeight: 700, fontSize: '15px', color: colors.primaryBlue, padding: '8px', background: colors.brandLight, borderRadius: '8px' },
  confirmCard: { background: colors.surface, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  confirmTitle: { fontSize: '16px', fontWeight: 700, color: colors.textPrimary, marginBottom: '4px' },
  confirmRow: { display: 'flex', gap: '12px', fontSize: '14px' },
  confirmLabel: { color: colors.textSecondary, fontWeight: 600, minWidth: '80px', flexShrink: 0 },
  confirmValue: { color: colors.textPrimary, fontWeight: 500, flex: 1 },
  tip: { background: colors.brandLight, color: colors.primaryBlue, borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 500, marginTop: '12px' },
  bottomCta: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: colors.surface, borderTop: `1px solid ${colors.border}`, padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', display: 'flex', gap: '12px', zIndex: 200 },
  btnBack: { flex: 1, padding: '14px', borderRadius: '12px', border: `1.5px solid ${colors.border}`, background: colors.surface, color: colors.textPrimary, fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  btnNext: { flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: colors.primaryBlue, color: colors.darkGrey, fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  btnPrimary: { flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: colors.primaryBlue, color: colors.darkGrey, fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
  btnDisabled: { flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: '#9ca3af', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'not-allowed' },
};