import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { goOnline, goOffline, subscribeToDriver, repairOrphanVan, DriverError } from '../services/drivers';
import { subscribeToOwnerVans } from '../services/vans';
import type { Van, VehicleType } from '../types';

// ─── Shared constants ─────────────────────────────────────────────────────────

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: '電單車',
  light: '輕型貨車',
  truck_5_5t: '5.5噸貨車',
  truck_9_5t: '9.5噸貨車',
  sedan: '轎車',
  van_7: '七人車',
};

interface OnlineToggleProps {
  onOnlineStateChange?: (isOnline: boolean) => void;
}

interface VanSelectorSheetProps {
  vans: Van[];
  onSelect: (van: Van) => void;
  onClose: () => void;
  loading?: boolean;
}

// ─── Van Selector Sheet ────────────────────────────────────────────────────────

function VanSelectorSheet({ vans, onSelect, onClose, loading }: VanSelectorSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div style={styles.sheetOverlay} onClick={onClose}>
      <div style={styles.sheetContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHeader}>
          <span style={styles.sheetTitle}>選擇上線車輛</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={styles.loadingText}>載入中…</div>
        ) : vans.length === 0 ? (
          <div style={styles.emptyText}>你尚未登記任何車輛</div>
        ) : (
          <div style={styles.vanList}>
            {vans.map((van) => (
              <div
                key={van.id}
                style={{
                  ...styles.vanCard,
                  ...(selectedId === van.id ? styles.vanCardSelected : {}),
                }}
                onClick={() => setSelectedId(van.id)}
              >
                <div style={styles.vanInfo}>
                  <div style={styles.vanPlate}>{van.plateNumber}</div>
                  <div style={styles.vanMeta}>
                    {VEHICLE_LABELS[van.vehicleType]} · {van.make} {van.model}
                  </div>
                  <div style={styles.vanCapacity}>
                    容量: {van.capacityKg}kg / {van.capacityM3}m³
                  </div>
                </div>
                {selectedId === van.id && (
                  <div style={styles.checkmark}>✓</div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          style={{
            ...styles.confirmBtn,
            ...(selectedId ? {} : styles.confirmBtnDisabled),
          }}
          disabled={!selectedId || loading}
          onClick={() => {
            const van = vans.find((v) => v.id === selectedId);
            if (van) onSelect(van);
          }}
        >
          {loading ? '處理中…' : '確認上線'}
        </button>
      </div>
    </div>
  );
}

// ─── Online Toggle ─────────────────────────────────────────────────────────────

export default function OnlineToggle({ onOnlineStateChange }: OnlineToggleProps) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentVanId, setCurrentVanId] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [showVanSelector, setShowVanSelector] = useState(false);
  const [vans, setVans] = useState<Van[]>([]);
  const [loadingVans, setLoadingVans] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Subscribe to driver state
  useEffect(() => {
    if (!user) return;

    // Repair any orphan van state from crashed sessions on mount
    repairOrphanVan(user.uid).catch(() => {});

    const unsub = subscribeToDriver(user.uid, (state) => {
      setIsOnline(state?.isOnline ?? false);
      setCurrentVanId(state?.currentVanId ?? null);
      setVehicleType(state?.vehicleType ?? null);
      onOnlineStateChange?.(state?.isOnline ?? false);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to owner's vans for selector
  useEffect(() => {
    if (!user) return;
    setLoadingVans(true);
    const unsub = subscribeToOwnerVans(user.uid, (data) => {
      // Only show available vans (not currently in use by another online session)
      setVans(data.filter((v) => v.isAvailable || v.id === currentVanId));
      setLoadingVans(false);
    });
    return () => unsub();
  }, [user, currentVanId]);

  const handleGoOnline = async (van: Van) => {
    if (!user) return;
    setLoadingAction(true);
    try {
      await goOnline(user.uid, van.id, van.vehicleType);
      setShowVanSelector(false);
      toast.success('已上線！');
    } catch (err) {
      if (err instanceof DriverError) {
        toast.error(err.message);
      } else {
        toast.error('上線失敗');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGoOffline = async () => {
    if (!user) return;
    setLoadingAction(true);
    try {
      await goOffline(user.uid);
      toast.success('已下線');
    } catch (err) {
      if (err instanceof DriverError) {
        toast.error(err.message);
      } else {
        toast.error('下線失敗');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <>
      <div style={styles.toggleContainer}>
        {/* Status indicator */}
        <div style={styles.statusRow}>
          <div style={{
            ...styles.statusDot,
            background: isOnline ? '#4CAF50' : '#9e9e9e',
          }} />
          <span style={styles.statusText}>
            {isOnline ? '在線' : '離線'}
          </span>
          {isOnline && currentVanId && (
            <span style={styles.vanBadge}>
              {VEHICLE_LABELS[vehicleType!] ?? '車輛'}
            </span>
          )}
        </div>

        {/* Action button */}
        {isOnline ? (
          <button
            style={styles.offlineBtn}
            onClick={handleGoOffline}
            disabled={loadingAction}
          >
            {loadingAction ? '處理中…' : '下線'}
          </button>
        ) : (
          <button
            style={styles.onlineBtn}
            onClick={() => setShowVanSelector(true)}
          >
            上線
          </button>
        )}
      </div>

      {/* Van selector sheet */}
      {showVanSelector && (
        <VanSelectorSheet
          vans={vans}
          loading={loadingVans || loadingAction}
          onSelect={handleGoOnline}
          onClose={() => {
            setShowVanSelector(false);
          }}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  toggleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 16px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
  vanBadge: {
    fontSize: '12px',
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: '4px',
  },
  onlineBtn: {
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  offlineBtn: {
    background: '#9e9e9e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Sheet styles
  sheetOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  sheetContent: {
    background: '#fff',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sheetTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#333',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
  },
  loadingText: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
  },
  emptyText: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
  },
  vanList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '16px',
  },
  vanCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px',
    background: '#f5f5f5',
    borderRadius: '12px',
    border: '2px solid transparent',
    cursor: 'pointer',
  },
  vanCardSelected: {
    border: '2px solid #4CAF50',
    background: '#e8f5e9',
  },
  vanInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  vanPlate: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#333',
  },
  vanMeta: {
    fontSize: '13px',
    color: '#666',
  },
  vanCapacity: {
    fontSize: '12px',
    color: '#999',
  },
  checkmark: {
    fontSize: '20px',
    color: '#4CAF50',
    fontWeight: 700,
  },
  confirmBtn: {
    width: '100%',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmBtnDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
};