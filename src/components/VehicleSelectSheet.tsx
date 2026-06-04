import { useState } from 'react';
import { colors, sp, rd } from '../styles';
import type { VehicleType } from '../types';

interface VehicleSelectSheetProps {
  onBack: () => void;
  onNext: (vanType: VehicleType) => void;
}

const VEHICLES: Array<{
  type: VehicleType;
  name: string;
  icon: string;
  volume: string;
  load: string;
  price: string;
}> = [
  { type: 'motorcycle', name: '小巴仔', icon: '🚚', volume: '5.5×4×4 呎', load: '700kg', price: 'HK$80' },
  { type: 'light', name: '中巴', icon: '🛻', volume: '7×5×5 呎', load: '1000kg', price: 'HK$120' },
  { type: 'truck_5_5t', name: '大巴', icon: '🚛', volume: '9×6×6 呎', load: '1500kg', price: 'HK$180' },
];

export default function VehicleSelectSheet({ onBack, onNext }: VehicleSelectSheetProps) {
  const [selected, setSelected] = useState<VehicleType>('light');

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
          <span style={styles.title}>選擇車型</span>
          <div style={{ width: 36 }} />
        </div>

        {/* Vehicle grid */}
        <div style={styles.grid}>
          {VEHICLES.map(v => (
            <div
              key={v.type}
              style={selected === v.type ? styles.cardActive : styles.card}
              onClick={() => setSelected(v.type)}
            >
              <span style={styles.vehicleIcon}>{v.icon}</span>
              <span style={selected === v.type ? styles.vehicleNameActive : styles.vehicleName}>
                {v.name}
              </span>
              <div style={styles.specRow}>
                <div style={styles.spec}>
                  <span style={styles.specLabel}>載貨</span>
                  <span style={styles.specValue}>{v.load}</span>
                </div>
                <div style={styles.spec}>
                  <span style={styles.specLabel}>車箱</span>
                  <span style={styles.specValue}>{v.volume}</span>
                </div>
              </div>
              <div style={styles.priceTag}>{v.price}起</div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={styles.bottomRow}>
          <button style={styles.nextBtn} onClick={() => onNext(selected)}>
            下一步
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
    background: 'rgba(0,0,0,0.3)',
    zIndex: 520,
  },
  sheet: {
    background: colors.white,
    borderRadius: `${rd.xl}px ${rd.xl}px 0 0`,
    padding: `${sp.sm}px ${sp.md}px 40px`,
  },
  handle: {
    width: 40,
    height: 4,
    background: colors.lightGrey,
    borderRadius: 2,
    margin: '0 auto 12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.lg,
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: sp.sm,
    marginBottom: sp.lg,
  },
  card: {
    background: colors.lightGrey,
    borderRadius: rd.lg,
    padding: `${sp.md}px ${sp.xs}px`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: '2px solid transparent',
    position: 'relative' as const,
  },
  cardActive: {
    background: '#FFFDE7',
    borderRadius: rd.lg,
    padding: `${sp.md}px ${sp.xs}px`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: `2px solid ${colors.yellow}`,
    position: 'relative' as const,
  },
  vehicleIcon: {
    fontSize: 36,
    display: 'block',
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.darkGrey,
    display: 'block',
    marginBottom: 6,
  },
  vehicleNameActive: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.orange,
    display: 'block',
    marginBottom: 6,
  },
  specRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    marginBottom: 6,
  },
  spec: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: 600,
  },
  specValue: {
    fontSize: 11,
    color: colors.darkGrey,
    fontWeight: 700,
  },
  priceTag: {
    fontSize: 13,
    fontWeight: 800,
    color: colors.primaryBlue,
  },
  bottomRow: {
    marginTop: sp.sm,
  },
  nextBtn: {
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
