import { useState } from 'react';
import { colors, sp, rd } from '../styles';
import type { VehicleType } from '../types';
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPE_EMOJI } from '../utils/helpers';

interface RouteSheetProps {
  pickup: string;
  dropoff: string;
  onBack: () => void;
  onNext: (time: string, vehicleType: VehicleType) => void;
}

type TimeMode = 'now' | 'schedule';

export default function RouteSheet({ pickup, dropoff, onBack, onNext }: RouteSheetProps) {
  const [timeMode, setTimeMode] = useState<TimeMode>('now');
  const [vehicleType, setVehicleType] = useState<VehicleType>('light');

  const handleNext = () => {
    const time = timeMode === 'now' ? 'now' : 'scheduled';
    onNext(time, vehicleType);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <div style={styles.handle} />

        {/* Back arrow + title */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={styles.title}>確認路線</span>
          <div style={{ width: 36 }} />
        </div>

        {/* Route summary */}
        <div style={styles.routeSummary}>
          <div style={styles.routePoint}>
            <div style={styles.dotPickup} />
            <span style={styles.addrText}>{pickup}</span>
          </div>
          <div style={styles.vertLine} />
          <div style={styles.routePoint}>
            <div style={styles.dotDropoff} />
            <span style={styles.addrText}>{dropoff}</span>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Time selector */}
        <div style={styles.sectionLabel}>時間</div>
        <div style={styles.timeRow}>
          <button
            style={timeMode === 'now' ? styles.timeBtnActive : styles.timeBtn}
            onClick={() => setTimeMode('now')}
          >
            即時
          </button>
          <button
            style={timeMode === 'schedule' ? styles.timeBtnActive : styles.timeBtn}
            onClick={() => setTimeMode('schedule')}
          >
            <span style={styles.calendarIcon}>📅</span>
            預約
          </button>
        </div>

        {/* Vehicle type */}
        <div style={styles.sectionLabel}>車型</div>
        <div style={styles.vanRow}>
          {(['motorcycle', 'light', 'truck_5_5t'] as VehicleType[]).map((vt) => (
            <div
              key={vt}
              style={vehicleType === vt ? styles.vanCardActive : styles.vanCard}
              onClick={() => setVehicleType(vt)}
            >
              <span style={styles.vanIcon}>{VEHICLE_TYPE_EMOJI[vt]}</span>
              <span style={vehicleType === vt ? styles.vanLabelActive : styles.vanLabel}>
                {VEHICLE_TYPE_LABELS[vt]}
              </span>
            </div>
          ))}
        </div>

        <div style={styles.bottomRow}>
          <button style={styles.nextBtn} onClick={handleNext}>
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
    zIndex: 510,
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
    marginBottom: sp.md,
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
  routeSummary: {
    background: colors.lightGrey,
    borderRadius: rd.md,
    padding: `${sp.sm}px ${sp.md}px`,
    marginBottom: sp.md,
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
  },
  dotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    border: `2px solid ${colors.primaryBlue}`,
    background: colors.white,
    flexShrink: 0,
  },
  dotDropoff: {
    width: 12,
    height: 12,
    borderRadius: 6,
    background: colors.orange,
    flexShrink: 0,
  },
  vertLine: {
    width: 2,
    height: 14,
    background: colors.border,
    marginLeft: 5,
    marginTop: 3,
    marginBottom: 3,
  },
  addrText: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.darkGrey,
  },
  divider: {
    height: 1,
    background: colors.border,
    margin: `${sp.sm}px 0`,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.textSecondary,
    marginBottom: sp.xs,
    marginTop: sp.sm,
  },
  timeRow: {
    display: 'flex',
    gap: sp.xs,
    marginBottom: sp.md,
  },
  timeBtn: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    background: colors.lightGrey,
    color: colors.darkGrey,
    border: 'none',
    borderRadius: rd.md,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeBtnActive: {
    flex: 1,
    padding: `${sp.sm}px 0`,
    background: colors.orange,
    color: colors.white,
    border: 'none',
    borderRadius: rd.md,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  calendarIcon: {
    fontSize: 14,
  },
  vanRow: {
    display: 'flex',
    gap: sp.xs,
    marginBottom: sp.lg,
  },
  vanCard: {
    flex: 1,
    background: colors.lightGrey,
    borderRadius: rd.md,
    padding: `${sp.sm}px 4px`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: '2px solid transparent',
  },
  vanCardActive: {
    flex: 1,
    background: '#FFFDE7',
    borderRadius: rd.md,
    padding: `${sp.sm}px 4px`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    border: `2px solid ${colors.yellow}`,
  },
  vanIcon: {
    fontSize: 24,
    display: 'block',
    marginBottom: 2,
  },
  vanLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.darkGrey,
    display: 'block',
  },
  vanLabelActive: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.orange,
    display: 'block',
  },
  vanSpec: {
    fontSize: 11,
    color: colors.textMuted,
    display: 'block',
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