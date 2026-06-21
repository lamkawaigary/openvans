import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getBooking, cancelBooking, startBooking, completeBooking } from '../services/bookings';
import { IconPackage } from '../components/Icon';
import type { Booking } from '../types';
import { colors, sp, rd } from '../styles';
import { formatDateTime, getStatusBadge, VAN_TYPE_EMOJI } from '../utils/helpers';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBooking(id).then(b => { setBooking(b); setLoading(false); }).catch(() => { setLoading(false); });
  }, [id]);

  const handleCancel = async () => {
    if (!booking || !user || !confirm('確定取消此訂單？')) return;
    setCancelling(true);
    try {
      const actorRole: 'renter' | 'driver' = user.uid === booking.renterId ? 'renter' : 'driver';
      await cancelBooking(booking.id, user.uid, actorRole);
      showNotification({ title: '已取消', body: '訂單已取消', type: 'info' });
      navigate('/trips');
    } catch {
      showNotification({ title: '取消失敗', body: '請重試', type: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  // Driver-side lifecycle actions: confirmed → in_progress → completed.
  const isDriverViewer = user && booking ? user.uid === booking.driverId : false;

  // Map state
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasCoords = !!(booking?.pickupLat && booking?.pickupLng && booking?.dropoffLat && booking?.dropoffLng);
  const pickupCoord = hasCoords && booking ? { lat: booking.pickupLat!, lng: booking.pickupLng! } : null;
  const dropoffCoord = hasCoords && booking ? { lat: booking.dropoffLat!, lng: booking.dropoffLng! } : null;
  const mapCenter = pickupCoord && dropoffCoord
    ? { lat: (pickupCoord.lat + dropoffCoord.lat) / 2, lng: (pickupCoord.lng + dropoffCoord.lng) / 2 }
    : pickupCoord || dropoffCoord || { lat: 22.3193, lng: 114.1694 };

  // Auto-position map: setCenter(midpoint) + zoom calibrated to make the
  // route cover ~70% of the SHORTER axis of the map. This guarantees visible
  // margin (~30% combined) on both sides of the route regardless of map
  // aspect ratio.
  //
  // Math: at zoom N, 1 degree of lat/lng ≈ (256 * 2^N / 360) px (Mercator).
  // Solve:  maxDiff * (256 * 2^zoom / 360) = targetPixels
  //         2^zoom = (targetPixels * 360) / (maxDiff * 256)
  //         zoom   = log2(...)
  //
  // This is more predictable than fitBounds() for wide-short containers.
  useEffect(() => {
    if (!mapRef.current || !pickupCoord || !dropoffCoord) return;

    const latDiff = Math.abs(pickupCoord.lat - dropoffCoord.lat);
    const lngDiff = Math.abs(pickupCoord.lng - dropoffCoord.lng);
    const maxDiff = Math.max(latDiff, lngDiff);
    if (maxDiff === 0) return;

    const mapDiv = mapRef.current.getDiv();
    const shorterAxis = Math.min(mapDiv.offsetWidth, mapDiv.offsetHeight);
    // Route should cover ~70% of the shorter axis (15% margin on each end)
    const targetPixels = shorterAxis * 0.7;
    const idealZoom = Math.log2((targetPixels * 360) / (maxDiff * 256));
    // Clamp to a reasonable range so we never end up on a degenerate zoom
    const zoom = Math.max(3, Math.min(18, Math.floor(idealZoom)));

    const center = {
      lat: (pickupCoord.lat + dropoffCoord.lat) / 2,
      lng: (pickupCoord.lng + dropoffCoord.lng) / 2,
    };

    mapRef.current.setCenter(center);
    mapRef.current.setZoom(zoom);
  }, [booking?.id, pickupCoord, dropoffCoord]);

  const handleStart = async () => {
    if (!booking || !user) return;
    setActing(true);
    try {
      await startBooking(booking.id, user.uid);
      showNotification({ title: '已開始送貨', body: '請準時到達取貨地點', type: 'success' });
      const updated = await getBooking(booking.id);
      if (updated) setBooking(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '請重試';
      showNotification({ title: '開始失敗', body: msg, type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleComplete = async () => {
    if (!booking || !user) return;
    setActing(true);
    try {
      await completeBooking(booking.id, user.uid);
      showNotification({ title: '已完成訂單', body: '感謝完成是次送貨', type: 'success' });
      navigate('/trips');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '請重試';
      showNotification({ title: '完成失敗', body: msg, type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const badge = booking ? getStatusBadge(booking.status) : null;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.title}>訂單詳情</span>
        <div style={{ width: 40 }} />
      </div>

      {loading ? (
        <div style={s.loading}>載入中…</div>
      ) : !booking ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>❌</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>找不到訂單</div>
        </div>
      ) : (
        <div style={s.content}>
          {/* Status banner */}
          {badge && (
            <div style={{ ...s.statusBanner, background: badge.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: badge.text,
                }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: badge.text }}>
                  {badge.label}
                </span>
              </div>
              {booking.estimatedPrice && (
                <span style={{ fontSize: 20, fontWeight: 800, color: colors.primaryBlue }}>
                  HK${booking.estimatedPrice}
                </span>
              )}
            </div>
          )}

          {/* Map view */}
          {hasCoords && (
            <div style={s.mapCard} data-testid="trip-map">
              <GoogleMap
                mapContainerStyle={s.mapContainer}
                center={mapCenter}
                zoom={12}
                onLoad={(map) => { mapRef.current = map; }}
                onUnmount={() => { mapRef.current = null; }}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  streetViewControl: false,
                  gestureHandling: 'cooperative',
                  styles: [
                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
                  ],
                }}
              >
                {pickupCoord && (
                  <Marker
                    position={pickupCoord}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: colors.primaryBlue,
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 3,
                    }}
                  />
                )}
                {dropoffCoord && (
                  <Marker
                    position={dropoffCoord}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: colors.orange,
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: 3,
                    }}
                  />
                )}
                {pickupCoord && dropoffCoord && (
                  <Polyline
                    path={[pickupCoord, dropoffCoord]}
                    options={{
                      strokeColor: colors.brand,
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                      geodesic: true,
                    }}
                  />
                )}
              </GoogleMap>
            </div>
          )}

          {/* Route card */}
          <div style={s.card}>
            <div style={s.cardTitle}>路線</div>
            <div style={s.routeRow}>
              <div style={s.pickupDot} />
              <div>
                <div style={s.routeLabel}>取貨</div>
                <div style={s.routeAddr}>{booking.pickupAddress}</div>
                <div style={s.routeTime}>
                  {formatDateTime(booking.pickupTime)}
                </div>
              </div>
            </div>
            <div style={s.routeLine} />
            <div style={s.routeRow}>
              <div style={s.dropoffDot} />
              <div>
                <div style={s.routeLabel}>送貨</div>
                <div style={s.routeAddr}>{booking.dropoffAddress}</div>
              </div>
            </div>
          </div>

          {/* Load info */}
          <div style={s.card}>
            <div style={s.cardTitle}>貨物資料</div>
            <div style={s.metaGrid}>
              <div style={s.metaItem}>
                <span style={s.metaEmoji}>{VAN_TYPE_EMOJI[booking.vehicleTypeRequired]}</span>
                <span style={s.metaLabel}>車型</span>
                <span style={s.metaValue}>{booking.vehicleTypeRequired}</span>
              </div>
              <div style={s.metaItem}>
                <span style={s.metaEmoji}><IconPackage size={16} color={colors.textMuted} /></span>
                <span style={s.metaLabel}>件數</span>
                <span style={s.metaValue}>{booking.totalLoadCount} 件</span>
              </div>
              <div style={s.metaItem}>
                <span style={s.metaEmoji}>🕐</span>
                <span style={s.metaLabel}>下單時間</span>
                <span style={s.metaValue}>{formatDateTime(booking.createdAt)}</span>
              </div>
            </div>
            {booking.loadDescription && (
              <div style={s.loadDesc}>
                <span style={s.loadDescLabel}>備註：</span>{booking.loadDescription}
              </div>
            )}
          </div>

          {/* Order ID */}
          <div style={s.orderIdRow}>
            <span style={s.orderIdLabel}>訂單編號</span>
            <span style={s.orderIdValue}>{booking.id}</span>
          </div>

          {/* Cancel button */}
          {booking.status === 'pending' && (
            <button
              style={cancelling ? s.cancelBtnDisabled : s.cancelBtn}
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? '取消中…' : '❌ 取消訂單'}
            </button>
          )}

          {/* Driver lifecycle actions: confirmed → in_progress → completed */}
          {isDriverViewer && booking.status === 'confirmed' && (
            <button
              data-testid="driver-start-btn"
              style={acting ? s.startBtnDisabled : s.startBtn}
              disabled={acting}
              onClick={handleStart}
            >
              {acting ? '處理中…' : '🚚 開始送貨'}
            </button>
          )}

          {isDriverViewer && booking.status === 'in_progress' && (
            <button
              data-testid="driver-complete-btn"
              style={acting ? s.completeBtnDisabled : s.completeBtn}
              disabled={acting}
              onClick={handleComplete}
            >
              {acting ? '處理中…' : '✅ 完成訂單'}
            </button>
          )}

          {isDriverViewer && (
            <div style={s.manageHint}>
              {booking.status === 'confirmed' && '接單後請準時開始送貨'}
              {booking.status === 'in_progress' && '送貨完成後請按「完成訂單」'}
              {booking.status === 'completed' && '✓ 訂單已完成'}
              {booking.status === 'cancelled' && '此訂單已取消'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: colors.background, fontFamily: 'Inter, system-ui, sans-serif', paddingTop: 'env(safe-area-inset-top)' },
  header: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, height: 56,
    background: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 200, boxShadow: `0 1px 3px ${colors.border}`,
  },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 700, color: colors.darkGrey },
  loading: { textAlign: 'center' as const, padding: '80px 20px', color: colors.textMuted },
  empty: { textAlign: 'center' as const, padding: '80px 20px' },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  content: { paddingTop: 'max(68px, calc(56px + env(safe-area-inset-top)))', paddingLeft: 16, paddingRight: 16, paddingBottom: 40, display: 'flex', flexDirection: 'column' as const, gap: 12 },
  statusBanner: {
    borderRadius: rd.lg,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    background: colors.surface,
    borderRadius: rd.lg,
    padding: sp.md,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: sp.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: sp.xs,
  },
  routeRow: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  pickupDot: { width: 14, height: 14, borderRadius: 7, border: `2.5px solid ${colors.primaryBlue}`, background: 'white', flexShrink: 0, marginTop: 2 },
  dropoffDot: { width: 14, height: 14, borderRadius: 7, background: colors.orange, flexShrink: 0, marginTop: 2 },
  routeLine: { width: 2, height: 20, background: colors.lightGrey, marginLeft: 6 },
  routeLabel: { fontSize: 12, color: colors.textMuted, fontWeight: 600 },
  routeAddr: { fontSize: 14, fontWeight: 600, color: colors.darkGrey, marginTop: 2 },
  routeTime: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metaGrid: { display: 'flex', gap: '16px' },
  metaItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, flex: 1 },
  metaEmoji: { fontSize: 24 },
  metaLabel: { fontSize: 11, color: colors.textMuted },
  metaValue: { fontSize: 13, fontWeight: 700, color: colors.darkGrey },
  loadDesc: { fontSize: 13, color: colors.textSecondary, background: colors.background, borderRadius: rd.sm, padding: '8px 12px', marginTop: sp.xs },
  loadDescLabel: { fontWeight: 600 },
  orderIdRow: { display: 'flex', gap: '8px', fontSize: 11, color: colors.textMuted, padding: '0 4px' },
  orderIdLabel: { fontWeight: 600 },
  orderIdValue: { fontFamily: 'monospace', wordBreak: 'break-all' as const },
  cancelBtn: {
    width: '100%', padding: '14px', borderRadius: rd.md,
    border: '1.5px solid #fca5a5', background: colors.errorBg, color: colors.error,
    fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: sp.sm,
  },
  cancelBtnDisabled: {
    width: '100%', padding: '14px', borderRadius: rd.md,
    border: '1.5px solid #fca5a5', background: '#fca5a5', color: '#7f1d1d',
    fontSize: 14, fontWeight: 700, cursor: 'not-allowed', marginTop: sp.sm,
  },
  startBtn: { width: '100%', padding: '14px', borderRadius: rd.md, border: 'none', background: colors.brand, color: colors.primary, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: sp.sm, boxShadow: colors.shadowSm },
  startBtnDisabled: { width: '100%', padding: '14px', borderRadius: rd.md, border: 'none', background: colors.lightGrey, color: colors.textMuted, fontSize: 16, fontWeight: 800, cursor: 'not-allowed', marginTop: sp.sm },
  completeBtn: { width: '100%', padding: '14px', borderRadius: rd.md, border: 'none', background: colors.success, color: colors.white, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: sp.sm, boxShadow: colors.shadowSm },
  completeBtnDisabled: { width: '100%', padding: '14px', borderRadius: rd.md, border: 'none', background: colors.lightGrey, color: colors.textMuted, fontSize: 16, fontWeight: 800, cursor: 'not-allowed', marginTop: sp.sm },
  manageHint: { textAlign: 'center', fontSize: 13, color: colors.textSecondary, padding: '8px 0', fontStyle: 'italic', marginTop: sp.xs },
  mapCard: { background: colors.surface, borderRadius: rd.lg, overflow: 'hidden', height: 220, border: `1px solid ${colors.border}`, position: 'relative' as const },
  mapContainer: { width: '100%', height: '100%' },
};