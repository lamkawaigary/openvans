import { useState } from 'react';
import { colors, sp, rd } from '../styles';

interface OrderDetailsSheetProps {
  pickup: string;
  dropoff: string;
  vanType: string;
  price: number;
  onBack: () => void;
  onConfirm: (options: OrderOptions) => void;
}

export interface OrderOptions {
  insurance: 'basic' | 'standard' | 'included';
  extraPassenger: number;
  petFriendly: boolean;
  englishDriver: boolean;
  tunnelPreference: boolean;
  tip: number;
}

const TIP_OPTIONS = [0, 20, 30, 40, 50];
const INSURANCE_OPTIONS: Array<{ key: 'included' | 'basic' | 'standard'; label: string; desc: string }> = [
  { key: 'included', label: '已包括', desc: '基本保障' },
  { key: 'basic', label: '基本', desc: 'HK$50,000' },
  { key: 'standard', label: '標準', desc: 'HK$100,000' },
];

export default function OrderDetailsSheet({
  pickup, dropoff, vanType, price, onBack, onConfirm
}: OrderDetailsSheetProps) {
  const [insurance, setInsurance] = useState<'included' | 'basic' | 'standard'>('included');
  const [extraPassenger, setExtraPassenger] = useState(0);
  const [petFriendly, setPetFriendly] = useState(false);
  const [englishDriver, setEnglishDriver] = useState(false);
  const [tunnelPref, setTunnelPref] = useState(false);
  const [tip, setTip] = useState(0);

  const total = price + (insurance === 'basic' ? 20 : insurance === 'standard' ? 40 : 0) + tip;

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <div style={styles.handle} />

        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={styles.title}>柯打詳情</span>
          <div style={{ width: 36 }} />
        </div>

        {/* Scrollable content */}
        <div style={styles.scrollContent}>

          {/* Route timeline */}
          <div style={styles.routeTimeline}>
            <div style={styles.routePoint}>
              <div style={styles.timelineDotPickup} />
              <span style={styles.timelineAddr}>{pickup}</span>
            </div>
            <div style={styles.timelineLine} />
            <div style={styles.routePoint}>
              <div style={styles.timelineDotDropoff} />
              <span style={styles.timelineAddr}>{dropoff}</span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* Vehicle info */}
          <div style={styles.vehicleRow}>
            <span style={styles.vanIcon}>
              {vanType === 'small' ? '🚚' : vanType === 'medium' ? '🛻' : '🚛'}
            </span>
            <span style={styles.vanLabel}>
              {vanType === 'small' ? '小巴仔' : vanType === 'medium' ? '中巴' : '大巴'}
            </span>
          </div>

          <div style={styles.divider} />

          {/* Insurance */}
          <div style={styles.sectionLabel}>保險</div>
          <div style={styles.optionRow}>
            {INSURANCE_OPTIONS.map(opt => (
              <div
                key={opt.key}
                style={insurance === opt.key ? styles.optionCardActive : styles.optionCard}
                onClick={() => setInsurance(opt.key)}
              >
                <span style={insurance === opt.key ? styles.optionLabelActive : styles.optionLabel}>
                  {opt.label}
                </span>
                <span style={styles.optionDesc}>{opt.desc}</span>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          {/* Extra services */}
          <div style={styles.sectionLabel}>附加服務</div>

          {/* Extra passenger stepper */}
          <div style={styles.serviceRow}>
            <span style={styles.serviceLabel}>跟車乘客</span>
            <div style={styles.stepper}>
              <button style={styles.stepBtn} onClick={() => setExtraPassenger(Math.max(0, extraPassenger - 1))}>−</button>
              <span style={styles.stepCount}>{extraPassenger}</span>
              <button style={styles.stepBtn} onClick={() => setExtraPassenger(extraPassenger + 1)}>+</button>
            </div>
          </div>

          {/* Toggles */}
          {[
            { label: '寵物友善司機', state: petFriendly, set: setPetFriendly },
            { label: '講英語司機', state: englishDriver, set: setEnglishDriver },
            { label: '隧道偏好', state: tunnelPref, set: setTunnelPref },
          ].map(item => (
            <div key={item.label} style={styles.serviceRow}>
              <span style={styles.serviceLabel}>{item.label}</span>
              <div
                style={item.state ? styles.toggleOn : styles.toggleOff}
                onClick={() => item.set(!item.state)}
              >
                <div style={item.state ? styles.toggleThumbOn : styles.toggleThumbOff} />
              </div>
            </div>
          ))}

          <div style={styles.divider} />

          {/* Tips */}
          <div style={styles.sectionLabel}>司機小費</div>
          <div style={styles.tipRow}>
            <div
              style={tip === 0 ? styles.tipChipActive : styles.tipChip}
              onClick={() => setTip(0)}
            >
              沒有
            </div>
            {TIP_OPTIONS.filter(t => t > 0).map(t => (
              <div
                key={t}
                style={tip === t ? styles.tipChipActive : styles.tipChip}
                onClick={() => setTip(t)}
              >
                ${t}
              </div>
            ))}
          </div>
        </div>

        {/* Sticky bottom */}
        <div style={styles.stickyBottom}>
          <div style={styles.paymentRow}>
            <span style={styles.paymentLabel}>💳 信用咭</span>
            <span style={styles.paymentChange}>更改</span>
          </div>
          <button
            style={styles.confirmBtn}
            onClick={() => onConfirm({ insurance, extraPassenger, petFriendly, englishDriver, tunnelPreference: tunnelPref, tip })}
          >
            落柯打啦 HK${total}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    background: 'rgba(0,0,0,0.3)',
    zIndex: 530,
  },
  sheet: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: colors.white,
    borderRadius: `${rd.xl}px ${rd.xl}px 0 0`,
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '90vh',
  },
  handle: {
    width: 40,
    height: 4,
    background: colors.lightGrey,
    borderRadius: 2,
    margin: '8px auto 0',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${sp.sm}px ${sp.md}px`,
    flexShrink: 0,
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: colors.darkGrey,
  },
  scrollContent: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: `0 ${sp.md}px`,
    paddingBottom: sp.md,
  },
  routeTimeline: {
    background: colors.lightGrey,
    borderRadius: rd.md,
    padding: `${sp.sm}px ${sp.md}px`,
    marginBottom: sp.sm,
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
  },
  timelineDotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    border: `2px solid ${colors.primaryBlue}`,
    background: colors.white,
    flexShrink: 0,
  },
  timelineDotDropoff: {
    width: 12,
    height: 12,
    borderRadius: 6,
    background: colors.orange,
    flexShrink: 0,
  },
  timelineLine: {
    width: 2,
    height: 16,
    background: colors.border,
    marginLeft: 5,
    marginTop: 3,
    marginBottom: 3,
  },
  timelineAddr: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.darkGrey,
  },
  divider: {
    height: 1,
    background: colors.border,
    margin: `${sp.sm}px 0`,
  },
  vehicleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.xs}px 0`,
  },
  vanIcon: {
    fontSize: 28,
  },
  vanLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.darkGrey,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.textSecondary,
    marginBottom: sp.xs,
    marginTop: sp.xs,
  },
  optionRow: {
    display: 'flex',
    gap: sp.xs,
    marginBottom: sp.xs,
  },
  optionCard: {
    flex: 1,
    padding: `${sp.sm}px 4px`,
    background: colors.lightGrey,
    borderRadius: rd.md,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: '2px solid transparent',
  },
  optionCardActive: {
    flex: 1,
    padding: `${sp.sm}px 4px`,
    background: '#E3F2FD',
    borderRadius: rd.md,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: `2px solid ${colors.primaryBlue}`,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.darkGrey,
    display: 'block',
  },
  optionLabelActive: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.primaryBlue,
    display: 'block',
  },
  optionDesc: {
    fontSize: 10,
    color: colors.textMuted,
    display: 'block',
  },
  serviceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${sp.xs}px 0`,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.darkGrey,
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    background: colors.lightGrey,
    borderRadius: rd.full,
    padding: '4px 8px',
  },
  stepBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
    color: colors.primaryBlue,
    padding: '0 4px',
    lineHeight: 1,
  },
  stepCount: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.darkGrey,
    minWidth: 20,
    textAlign: 'center' as const,
  },
  toggleOn: {
    width: 44,
    height: 26,
    borderRadius: 13,
    background: colors.primaryBlue,
    padding: 2,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toggleOff: {
    width: 44,
    height: 26,
    borderRadius: 13,
    background: colors.lightGrey,
    padding: 2,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  toggleThumbOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: colors.white,
  },
  toggleThumbOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: colors.white,
  },
  tipRow: {
    display: 'flex',
    gap: sp.xs,
    marginBottom: sp.md,
  },
  tipChip: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    background: colors.lightGrey,
    borderRadius: rd.full,
    textAlign: 'center' as const,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    color: colors.darkGrey,
    border: '2px solid transparent',
  },
  tipChipActive: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    background: '#FFF3E0',
    borderRadius: rd.full,
    textAlign: 'center' as const,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    color: colors.orange,
    border: `2px solid ${colors.orange}`,
  },
  stickyBottom: {
    borderTop: `1px solid ${colors.border}`,
    padding: `${sp.sm}px ${sp.md}px 40px`,
    flexShrink: 0,
  },
  paymentRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.darkGrey,
  },
  paymentChange: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.primaryBlue,
    cursor: 'pointer',
  },
  confirmBtn: {
    width: '100%',
    padding: `${sp.md}px 0`,
    background: colors.primaryBlue,
    color: colors.white,
    border: 'none',
    borderRadius: rd.md,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};
