import { useState } from 'react';
import { colors, sp, rd } from '../styles';

export type ServiceTab = 'ride' | 'delivery' | 'move';

interface LocationSheetProps {
  onClose: () => void;
  onNext: (pickup: string, dropoff: string, extraStops: string[], service: ServiceTab) => void;
}

const TAB_LABELS: Record<ServiceTab, string> = {
  ride: '叫車',
  delivery: '速遞',
  move: '搬屋',
};

export default function LocationSheet({ onClose, onNext }: LocationSheetProps) {
  const [service, setService] = useState<ServiceTab>('delivery');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [extraStops, setExtraStops] = useState<string[]>([]);
  const [newStop, setNewStop] = useState('');

  const canProceed = pickup.trim().length > 0 && dropoff.trim().length > 0;

  const handleAddStop = () => {
    if (newStop.trim()) {
      setExtraStops(prev => [...prev, newStop.trim()]);
      setNewStop('');
    }
  };

  const handleNext = () => {
    if (canProceed) onNext(pickup, dropoff, extraStops, service);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        {/* Drag handle */}
        <div style={styles.handle} />

        {/* Service tabs */}
        <div style={styles.tabRow}>
          {(Object.keys(TAB_LABELS) as ServiceTab[]).map(tab => (
            <div
              key={tab}
              style={service === tab ? styles.tabActive : styles.tab}
              onClick={() => setService(tab)}
            >
              {TAB_LABELS[tab]}
            </div>
          ))}
        </div>

        {/* Pickup */}
        <div style={styles.fieldRow}>
          <div style={styles.dotPickup} />
          <input
            style={styles.input}
            placeholder="起始點"
            value={pickup}
            onChange={e => setPickup(e.target.value)}
          />
        </div>

        {/* Route line visual */}
        <div style={styles.routeLine} />

        {/* Dropoff */}
        <div style={styles.fieldRow}>
          <div style={styles.dotDropoff} />
          <input
            style={styles.input}
            placeholder="落貨點"
            value={dropoff}
            onChange={e => setDropoff(e.target.value)}
          />
        </div>

        {/* Extra stops */}
        {extraStops.map((stop, i) => (
          <div key={i} style={styles.fieldRow}>
            <div style={{ ...styles.dotPickup, background: colors.lightGrey, border: `2px solid ${colors.primaryBlue}` }} />
            <span style={styles.stopText}>{stop}</span>
          </div>
        ))}

        {/* Add stop */}
        <div style={styles.addStopRow}>
          <button style={styles.addStopBtn} onClick={handleAddStop}>
            <span style={styles.addStopPlus}>+</span>
            <span>新增落貨點</span>
          </button>
          {newStop !== undefined && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="輸入中途點"
                value={newStop}
                onChange={e => setNewStop(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddStop()}
              />
            </div>
          )}
        </div>

        {/* Bottom buttons */}
        <div style={styles.bottomRow}>
          <button style={styles.cancelBtn} onClick={onClose}>取消</button>
          <button
            style={{ ...styles.nextBtn, opacity: canProceed ? 1 : 0.4 }}
            onClick={handleNext}
            disabled={!canProceed}
          >
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
    zIndex: 500,
  },
  sheet: {
    background: colors.white,
    borderRadius: `${rd.xl}px ${rd.xl}px 0 0`,
    padding: `${sp.sm}px ${sp.md}px ${sp.xl}px`,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    background: colors.lightGrey,
    borderRadius: 2,
    margin: '0 auto 16px',
  },
  tabRow: {
    display: 'flex',
    gap: 4,
    marginBottom: sp.lg,
    borderBottom: `2px solid ${colors.lightGrey}`,
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    textAlign: 'center' as const,
    fontSize: 15,
    fontWeight: 700,
    color: colors.textMuted,
    cursor: 'pointer',
    borderBottom: `3px solid transparent`,
    marginBottom: -2,
  },
  tabActive: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    textAlign: 'center' as const,
    fontSize: 15,
    fontWeight: 700,
    color: colors.primaryBlue,
    cursor: 'pointer',
    borderBottom: `3px solid ${colors.primaryBlue}`,
    marginBottom: -2,
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.xs}px 0`,
  },
  dotPickup: {
    width: 14,
    height: 14,
    borderRadius: 7,
    border: `2.5px solid ${colors.primaryBlue}`,
    background: colors.white,
    flexShrink: 0,
  },
  dotDropoff: {
    width: 14,
    height: 14,
    borderRadius: 7,
    background: colors.orange,
    flexShrink: 0,
  },
  routeLine: {
    width: 2,
    height: 18,
    background: colors.lightGrey,
    marginLeft: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    border: `1.5px solid ${colors.lightGrey}`,
    borderRadius: rd.md,
    padding: `${sp.sm}px ${sp.md}px`,
    fontSize: 15,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: colors.darkGrey,
    outline: 'none',
    background: colors.white,
  },
  stopText: {
    flex: 1,
    fontSize: 15,
    color: colors.darkGrey,
  },
  addStopRow: {
    marginTop: sp.sm,
  },
  addStopBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: `${sp.xs}px 0`,
    fontSize: 14,
    fontWeight: 600,
    color: colors.primaryBlue,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  addStopPlus: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
  },
  bottomRow: {
    display: 'flex',
    gap: sp.sm,
    marginTop: sp.lg,
  },
  cancelBtn: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    background: colors.lightGrey,
    color: colors.darkGrey,
    border: 'none',
    borderRadius: rd.md,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  nextBtn: {
    flex: 2,
    padding: `${sp.sm}px 0`,
    background: colors.primaryBlue,
    color: colors.white,
    border: 'none',
    borderRadius: rd.md,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};
