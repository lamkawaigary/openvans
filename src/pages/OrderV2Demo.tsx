import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import BottomSheet, { type BottomSheetState } from '../components/BottomSheet';
import { colors } from '../styles';
import { getPlaceSuggestions, type PlaceSuggestion, reverseGeocode } from './HomePage';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useSideMenu } from '../context/SideMenuContext';
import { createBooking } from '../services/bookings';
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPE_EMOJI, VEHICLE_TYPE_CAPACITY } from '../utils/helpers';
import type { VehicleType } from '../types';

type ServiceType = 'delivery' | 'truck' | 'cross_border';
const SERVICE_LABELS: Record<ServiceType, { label: string; icon: string; desc: string }> = {
  delivery: { label: '速遞', icon: '📦', desc: '小型包裹 / 文件' },
  truck: { label: '叫貨車', icon: '🚛', desc: '大件 / 搬屋' },
  cross_border: { label: '跨境車', icon: '🛂', desc: '中港兩地運輸' },
};
const CROSS_BORDER_CHECKPOINTS = [
  { value: 'huanggang', label: '皇崗', fee: 250 },
  { value: 'shatoujiao', label: '沙頭角', fee: 180 },
  { value: 'luohu', label: '羅湖', fee: 200 },
  { value: 'lok_ma_chau', label: '落馬洲', fee: 200 },
  { value: 'man_kam_to', label: '文錦渡', fee: 180 },
  { value: 'shenzhen_bay', label: '深圳灣', fee: 220 },
  { value: 'futian', label: '福田', fee: 0 },
];

const DEFAULT_CENTER = { lat: 22.2819, lng: 114.1582 };
const DEFAULT_START = { lat: 22.2855, lng: 114.1574 };

const containerStyle: React.CSSProperties = { width: '100%', height: '100%' };
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  backgroundColor: '#E8F0E4',
};

type Coord = { lat: number; lng: number };
type SheetMode = 'idle' | 'searching-start' | 'searching-end' | 'searching-waypoint' | 'dragging';

export default function OrderV2Demo() {
  const [sheetMode, setSheetMode] = useState<SheetMode>('idle');
  const [startCoord, setStartCoord] = useState<Coord>(DEFAULT_START);
  const [startLabel, setStartLabel] = useState('中環國際金融中心商場');
  const [endCoord, setEndCoord] = useState<Coord | null>(null);
  const [endLabel, setEndLabel] = useState<string | null>(null);
  const [pendingCoord, setPendingCoord] = useState<Coord | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('light');
  const [submitting, setSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>('truck');
  const [pickupMode, setPickupMode] = useState<'now' | 'schedule'>('now');
  const [pickupTime, setPickupTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [crossBorderCheckpoint, setCrossBorderCheckpoint] = useState<string>('huanggang');
  const [crossBorderNotes, setCrossBorderNotes] = useState<string>('');
  const [waypoints, setWaypoints] = useState<Array<{ coord: Coord; label: string; customName?: string }>>([]);
  // Phase 7.2: reorder state
  const [draggingWaypointIdx, setDraggingWaypointIdx] = useState<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  // Phase 7.3: rename inline edit
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Phase 7.5: file upload (stub)
  const [attachments, setAttachments] = useState<Array<{ fileName: string; sizeBytes: number; mimeType: string }>>([]);

  const MAX_WAYPOINTS = 3;
  const addWaypoint = (coord: Coord, label: string) => {
    if (waypoints.length >= MAX_WAYPOINTS) return;
    setWaypoints(prev => [...prev, { coord, label }]);
  };
  const removeWaypoint = (i: number) => {
    setWaypoints(prev => prev.filter((_, idx) => idx !== i));
    if (draggingWaypointIdx === i) setDraggingWaypointIdx(null);
    if (renamingIdx === i) { setRenamingIdx(null); setRenameValue(''); }
  };

  // Phase 7.2: reorder waypoints via long-press drag handle
  const handleDragHandleMouseDown = (idx: number) => {
    longPressTimer.current = window.setTimeout(() => {
      setDraggingWaypointIdx(idx);
    }, 300);
  };
  const handleDragHandleMouseUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const cancelWaypointDrag = () => setDraggingWaypointIdx(null);
  const moveWaypoint = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setWaypoints(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };
  // Suppress unused warning
  void removeWaypoint;
  void cancelWaypointDrag;
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchTimer = useRef<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { openMenu } = useSideMenu();

  // Haversine distance in km (includes waypoints)
  const distanceKm = useMemo(() => {
    if (!endCoord) return 0;
    const R = 6371;
    const segs: Coord[] = [startCoord, ...waypoints.map(w => w.coord), endCoord];
    let total = 0;
    for (let i = 0; i < segs.length - 1; i++) {
      const a = segs[i], b = segs[i + 1];
      const dLat = (b.lat - a.lat) * Math.PI / 180;
      const dLon = (b.lng - a.lng) * Math.PI / 180;
      const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
      total += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
    }
    return total;
  }, [endCoord, startCoord, waypoints]);

  // Polyline path A → W1 → W2 → B
  const routePath = useMemo(() => {
    if (!endCoord) return [];
    return [startCoord, ...waypoints.map(w => w.coord), endCoord];
  }, [endCoord, startCoord, waypoints]);

  // (handleAddWaypointAt deferred — Phase 6b uses search-based add, not map-click)
  void addWaypoint;

  const etaMin = useMemo(() => Math.max(5, Math.round(distanceKm * 2.5)), [distanceKm]);

  const estimatedPrice = useMemo(() => {
    const base: Record<VehicleType, number> = { motorcycle: 80, light: 180, van_7: 220, truck_5_5t: 280, truck_9_5t: 420, sedan: 150 };
    let price = (base[vehicleType] || 200) + Math.round(distanceKm * 8);
    // Phase 7.4: cross-border surcharge (per-port flat fee)
    if (serviceType === 'cross_border') {
      const port = CROSS_BORDER_CHECKPOINTS.find(cp => cp.value === crossBorderCheckpoint);
      if (port) price += port.fee;
    }
    return price;
  }, [distanceKm, vehicleType, serviceType, crossBorderCheckpoint]);

  const handleSubmit = async () => {
    if (!endCoord || !endLabel || !user) return;
    setSubmitting(true);
    try {
      // Build pickup time: now + 1h for 即時 mode, or user-picked for 預約
      const finalPickupTime = pickupMode === 'now'
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : new Date(pickupTime).toISOString();

      const id = await createBooking({
        renterId: user.uid,
        pickupAddress: startLabel,
        pickupLat: startCoord.lat,
        pickupLng: startCoord.lng,
        dropoffAddress: endLabel,
        dropoffLat: endCoord.lat,
        dropoffLng: endCoord.lng,
        waypoints: waypoints.length > 0 ? waypoints.map(w => ({
          name: w.customName || w.label, // Phase 7.3: prefer customName
          address: w.label,
          lat: w.coord.lat,
          lng: w.coord.lng,
        })) : undefined,
        // Phase 7.4: include surcharge breakdown if cross-border
        ...(serviceType === 'cross_border' && {
          crossBorder: {
            portId: crossBorderCheckpoint,
            portNameZh: CROSS_BORDER_CHECKPOINTS.find(cp => cp.value === crossBorderCheckpoint)?.label || '',
            surcharge: CROSS_BORDER_CHECKPOINTS.find(cp => cp.value === crossBorderCheckpoint)?.fee || 0,
          },
        }),
        // Phase 7.5: file attachments (stub)
        attachments: attachments.length > 0 ? attachments : undefined,
        serviceType,
        ...(serviceType === 'cross_border' && {
          crossBorderCheckpoint,
          crossBorderNotes,
        }),
        loads: [],
        totalLoadCount: 1,
        vehicleTypeRequired: vehicleType,
        estimatedPrice,
        pickupTime: finalPickupTime,
        loadDescription: '',
        notes: '',
      } as any);
      showNotification({ title: '落單成功！', body: `Booking #${id.slice(0, 6)} 已建立`, type: 'success' });
      setTimeout(() => navigate('/trips'), 800);
    } catch (err: any) {
      showNotification({ title: '落單失敗', body: err?.message || '請稍後再試', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const sheetState: BottomSheetState =
    sheetMode === 'idle' ? 'half' : sheetMode === 'dragging' ? 'peek' : 'full';

  // Debounced place search
  useEffect(() => {
    if (sheetMode !== 'searching-start' && sheetMode !== 'searching-end' && sheetMode !== 'searching-waypoint') {
      setResults([]);
      return;
    }
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      try {
        const r = await getPlaceSuggestions(query.trim());
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query, sheetMode]);

  // Fit bounds when any waypoint / end / start changes.
  // Triggered by waypoints length (not by reference) to avoid jitter on every render.
  // Fix C: padding 80→220 to keep route/pins visible above the bottom sheet
  // (sheet idle=half 62% vh, dragging=peek 240px) without being clipped.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: Coord[] = [startCoord, ...waypoints.map(w => w.coord)];
    if (endCoord) points.push(endCoord);
    if (points.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, 220);
    } else {
      map.setCenter(startCoord);
      map.setZoom(15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endCoord, startCoord, waypoints.length, waypoints.map(w => `${w.coord.lat},${w.coord.lng}`).join('|')]);

  // Map click → if in a search context, directly set the corresponding station;
  // otherwise drop a pending pin + show peek sheet for confirmation (default = set end).
  // Fix B: respect sheetMode context so user-initiated 'searching-start' / 'searching-end' /
  // 'searching-waypoint' click on map does NOT silently overwrite dropoff.
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const coord = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    const targetMode = sheetMode; // capture for async use

    // If user is in a search context, apply click to that station immediately
    if (targetMode === 'searching-start' || targetMode === 'searching-end' || targetMode === 'searching-waypoint') {
      reverseGeocode(coord.lat, coord.lng)
        .then(addr => {
          if (targetMode === 'searching-start') {
            setStartCoord(coord);
            setStartLabel(addr);
          } else if (targetMode === 'searching-end') {
            setEndCoord(coord);
            setEndLabel(addr);
          } else {
            addWaypoint(coord, addr);
          }
          setSheetMode('idle');
        })
        .catch(() => {
          const fallback = `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`;
          if (targetMode === 'searching-start') {
            setStartCoord(coord);
            setStartLabel(fallback);
          } else if (targetMode === 'searching-end') {
            setEndCoord(coord);
            setEndLabel(fallback);
          } else {
            addWaypoint(coord, fallback);
          }
          setSheetMode('idle');
        });
      return;
    }

    // Default: idle / dragging mode click → show drag confirm panel (default = set end)
    setPendingCoord(coord);
    setPendingLabel('載入地址中...');
    setSheetMode('dragging');
    reverseGeocode(coord.lat, coord.lng)
      .then(addr => setPendingLabel(addr))
      .catch(() => setPendingLabel(`${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`));
  };

  // Drag-end listener — register inside onLoad so it definitely attaches after map mount.
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener('dragend', () => {
      const center = map.getCenter();
      if (!center) return;
      const coord = { lat: center.lat(), lng: center.lng() };
      setPendingCoord(coord);
      setPendingLabel('載入地址中...');
      setSheetMode('dragging');
      reverseGeocode(coord.lat, coord.lng)
        .then(addr => setPendingLabel(addr))
        .catch(() => setPendingLabel(`${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`));
    });
  };

  const enterSearch = (field: 'start' | 'end' | 'waypoint') => {
    setSheetMode(field === 'start' ? 'searching-start' : field === 'end' ? 'searching-end' : 'searching-waypoint');
    setQuery('');
    setResults([]);
  };

  const handleSelect = (s: PlaceSuggestion) => {
    const coord = { lat: s.lat, lng: s.lon };
    if (sheetMode === 'searching-start') {
      setStartCoord(coord);
      setStartLabel(s.mainText);
    } else if (sheetMode === 'searching-waypoint') {
      addWaypoint(coord, s.mainText);
    } else {
      setEndCoord(coord);
      setEndLabel(s.mainText);
    }
    setQuery('');
    setResults([]);
    setSheetMode('idle');
  };

  const cancelSearch = () => {
    setQuery('');
    setResults([]);
    setSheetMode('idle');
  };

  const isFullSheet = sheetMode === 'searching-start' || sheetMode === 'searching-end' || sheetMode === 'searching-waypoint';
  const isPeek = sheetMode === 'dragging';
  const isHalf = sheetMode === 'idle';

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={DEFAULT_CENTER}
          zoom={14}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
          options={mapOptions}
        >
          <Marker position={startCoord} zIndex={10} icon={{
            path: 'M 0,-10 A 10,10 0 1,0 0,10 L 0,4 L -2,4 L -2,-6 Z',
            fillColor: colors.brand, fillOpacity: 1,
            strokeColor: '#fff', strokeWeight: 3, scale: 1.5,
          }} />
          {endCoord && (
            <Marker position={endCoord} zIndex={11} icon={{
              path: 'M 0,-10 A 10,10 0 1,0 0,10 L 0,4 L -2,4 L -2,-6 Z',
              fillColor: colors.textPrimary, fillOpacity: 1,
              strokeColor: '#fff', strokeWeight: 3, scale: 1.5,
            }} />
          )}
          {pendingCoord && (
            <Marker position={pendingCoord} zIndex={12} icon={{
              path: 'M 0,-10 A 10,10 0 1,0 0,10 L 0,4 L -2,4 L -2,-6 Z',
              fillColor: colors.brand, fillOpacity: 1,
              strokeColor: '#fff', strokeWeight: 4, scale: 1.8,
            }} />
          )}
          {/* Waypoint markers (grey) */}
          {waypoints.map((w, i) => (
            <Marker key={`wp-${i}`} position={w.coord} zIndex={11} icon={{
              path: 'M 0,-10 A 10,10 0 1,0 0,10 L 0,4 L -2,4 L -2,-6 Z',
              fillColor: '#6B7280', fillOpacity: 1,
              strokeColor: '#fff', strokeWeight: 3, scale: 1.3,
            }} label={{ text: String(i + 1), color: '#fff', fontSize: '12px', fontWeight: '700' }} />
          ))}
          {/* Polyline A → W1 → W2 → B */}
          {routePath.length >= 2 && (
            <Polyline path={routePath} options={{ strokeColor: colors.brand, strokeOpacity: 0.8, strokeWeight: 4, geodesic: true }} />
          )}
        </GoogleMap>
      </div>

      {/* Hamburger button (top-left) — 開 SideMenu access user controls */}
      <button
        onClick={openMenu}
        aria-label="開啟選單"
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 51,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.95)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 20, fontWeight: 700, color: '#111827',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >☰</button>

      <div style={{
        position: 'absolute', top: 16, right: 16, zIndex: 50,
        padding: '8px 14px', background: 'rgba(0,0,0,0.8)', color: '#fff',
        borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center',
        backdropFilter: 'blur(8px)',
        maxWidth: 'calc(100vw - 80px)',
      }}>
        🧪 Phase 7 · Sheet: <strong style={{ color: '#FFD700' }}>{sheetMode}</strong>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, fontWeight: 400 }}>
          揀車 + 確認 → Firestore createBooking
        </div>
      </div>

      <BottomSheet initialState="half" externalState={sheetState} onStateChange={s => {
        if (s === 'half' && isFullSheet) cancelSearch();
      }}>
        {isHalf && (
          <div style={{ padding: '8px 20px 24px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary, marginBottom: 12 }}>📦 落單</div>

            {/* Phase 6a-1: Service type tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: colors.background, borderRadius: 12, padding: 4 }}>
              {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(st => {
                const sel = serviceType === st;
                return (
                  <div key={st} onClick={() => setServiceType(st)} style={{ flex: 1, padding: '10px 6px', textAlign: 'center', background: sel ? colors.surface : 'transparent', borderRadius: 9, cursor: 'pointer', boxShadow: sel ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 4 }}>{SERVICE_LABELS[st].icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: sel ? colors.textPrimary : colors.textMuted }}>{SERVICE_LABELS[st].label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginBottom: 12, marginTop: -8 }}>{SERVICE_LABELS[serviceType].desc}</div>
            <div style={{ background: colors.background, borderRadius: 16, padding: 6, marginBottom: 12, border: `1.5px solid ${colors.border}`, position: 'relative' }}>
              <div onClick={() => enterSearch('start')} style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12, minHeight: 48, cursor: 'pointer', borderRadius: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.brand, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{startLabel}</div>
              </div>

              {/* Phase 7.2 + 7.3: Waypoint list with reorder handle + rename — MOVED between pickup and dropoff (Fix A) */}

              {waypoints.length > 0 && (
                <div style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px', marginBottom: 6 }}>中途站 ({waypoints.length}/{MAX_WAYPOINTS})</div>
                  {waypoints.map((w, i) => (
                    <div
                      key={`wp-row-${i}`}
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: draggingWaypointIdx === i ? colors.brandLight : colors.surface, border: `1.5px solid ${draggingWaypointIdx === i ? colors.brand : colors.border}`, borderRadius: 12, marginBottom: 6, minHeight: 48, opacity: draggingWaypointIdx !== null && draggingWaypointIdx !== i ? 0.5 : 1, transition: 'opacity 0.15s' }}
                    >
                      <div
                        onMouseDown={() => handleDragHandleMouseDown(i)}
                        onMouseUp={handleDragHandleMouseUp}
                        onMouseLeave={handleDragHandleMouseUp}
                        onTouchStart={() => handleDragHandleMouseDown(i)}
                        onTouchEnd={handleDragHandleMouseUp}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: colors.textMuted, fontSize: 18, userSelect: 'none', touchAction: 'none', flexShrink: 0 }}
                        title="長按拖動重新排序"
                      >≡</div>
                      {renamingIdx === i ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => {
                            const trimmed = renameValue.trim();
                            setWaypoints(prev => prev.map((wp, idx) => idx === i ? { ...wp, customName: trimmed || undefined } : wp));
                            setRenamingIdx(null);
                            setRenameValue('');
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') { setRenamingIdx(null); setRenameValue(''); }
                          }}
                          placeholder={w.label}
                          maxLength={50}
                          style={{ flex: 1, fontSize: 14, padding: '6px 8px', border: `1.5px solid ${colors.brand}`, borderRadius: 8, background: colors.surface, color: colors.textPrimary, outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
                        />
                      ) : (
                        <div
                          onClick={() => { setRenamingIdx(i); setRenameValue(w.customName || ''); }}
                          style={{ flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: 500, cursor: 'pointer', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title="點擊改名"
                        >
                          {w.customName || w.label}
                          {w.customName && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.label}</div>}
                        </div>
                      )}
                      <div onClick={() => removeWaypoint(i)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted, fontSize: 18, flexShrink: 0 }} title="刪除中途站">×</div>
                    </div>
                  ))}
                  {draggingWaypointIdx !== null && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        onClick={() => { moveWaypoint(draggingWaypointIdx, Math.max(0, draggingWaypointIdx - 1)); }}
                        disabled={draggingWaypointIdx === 0}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: draggingWaypointIdx === 0 ? colors.background : colors.surface, color: draggingWaypointIdx === 0 ? colors.textMuted : colors.textPrimary, fontSize: 13, fontWeight: 600, cursor: draggingWaypointIdx === 0 ? 'not-allowed' : 'pointer' }}
                      >↑ 上移</button>
                      <button
                        onClick={() => { moveWaypoint(draggingWaypointIdx, Math.min(waypoints.length - 1, draggingWaypointIdx + 1)); setDraggingWaypointIdx(null); }}
                        disabled={draggingWaypointIdx === waypoints.length - 1}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: draggingWaypointIdx === waypoints.length - 1 ? colors.background : colors.surface, color: draggingWaypointIdx === waypoints.length - 1 ? colors.textMuted : colors.textPrimary, fontSize: 13, fontWeight: 600, cursor: draggingWaypointIdx === waypoints.length - 1 ? 'not-allowed' : 'pointer' }}
                      >↓ 下移</button>
                      <button onClick={() => setDraggingWaypointIdx(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>完成</button>
                    </div>
                  )}
                  {waypoints.length < MAX_WAYPOINTS && (
                    <div onClick={() => enterSearch('waypoint')} style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px dashed ${colors.border}`, textAlign: 'center', color: colors.brand, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
                      ＋ 加入新中途站
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: 1, background: colors.border, marginLeft: 24 }} />
              <div onClick={() => enterSearch('end')} style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12, minHeight: 48, cursor: 'pointer', borderRadius: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.textPrimary, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 15, color: endLabel ? colors.textPrimary : colors.textMuted }}>
                  {endLabel || '選擇終點...'}
                </div>
              </div>
            </div>

            {/* Legacy waypoint list removed in Fix A — waypoint list now renders between pickup and dropoff rows above */}
            {endCoord && (
              <>
                <div style={{ background: 'linear-gradient(135deg, #F4FBE0 0%, #E8F5C8 100%)', borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${colors.brandLight}` }}>
                  <div style={{ fontSize: 24 }}>⏱️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 500 }}>預計車程</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{etaMin} 分鐘 · {distanceKm.toFixed(1)} km</div>
                  </div>
                </div>

                {/* Phase 6a-2: Pickup time toggle */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div onClick={() => setPickupMode('now')} style={{ flex: 1, padding: '10px 12px', textAlign: 'center', background: pickupMode === 'now' ? colors.brandLight : colors.background, border: `1.5px solid ${pickupMode === 'now' ? colors.brand : colors.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: pickupMode === 'now' ? colors.textPrimary : colors.textMuted }}>
                      ⚡ 即時出發
                    </div>
                    <div onClick={() => setPickupMode('schedule')} style={{ flex: 1, padding: '10px 12px', textAlign: 'center', background: pickupMode === 'schedule' ? colors.brandLight : colors.background, border: `1.5px solid ${pickupMode === 'schedule' ? colors.brand : colors.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: pickupMode === 'schedule' ? colors.textPrimary : colors.textMuted }}>
                      📅 預約時間
                    </div>
                  </div>
                  {pickupMode === 'schedule' && (
                    <input type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${colors.border}`, background: colors.surface, fontSize: 15, color: colors.textPrimary, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                  )}
                  {pickupMode === 'now' && (
                    <div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', padding: 4 }}>🚐 平均 15-30 分鐘內有司機接單</div>
                  )}
                </div>

                {/* Phase 6a-3 + 7.4 + 7.5: Cross-border mode banner */}
                {serviceType === 'cross_border' && (
                  <div style={{ background: 'linear-gradient(135deg, #FFF7E6 0%, #FFE8B3 100%)', borderRadius: 14, padding: 14, marginBottom: 12, border: '1.5px solid #FFB84D' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>🛂</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>跨境服務</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#78350F', fontWeight: 600, marginBottom: 4 }}>過境口岸</div>
                    <select value={crossBorderCheckpoint} onChange={e => setCrossBorderCheckpoint(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #FFB84D', background: '#FFFFFF', fontSize: 14, color: '#111827', fontFamily: 'inherit', outline: 'none', marginBottom: 10, boxSizing: 'border-box' as const }}>
                      {CROSS_BORDER_CHECKPOINTS.map(cp => <option key={cp.value} value={cp.value}>{cp.label}{cp.fee > 0 ? ` (+$${cp.fee})` : ''}</option>)}
                    </select>
                    {/* Phase 7.4: Surcharge breakdown */}
                    {(() => {
                      const port = CROSS_BORDER_CHECKPOINTS.find(cp => cp.value === crossBorderCheckpoint);
                      if (!port || port.fee === 0) return null;
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#78350F' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span>基本車資</span>
                            <span>${estimatedPrice - port.fee}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>跨境附加費 · {port.label}</span>
                            <span>${port.fee}</span>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ fontSize: 12, color: '#78350F', fontWeight: 600, marginBottom: 4 }}>海關申報備註</div>
                    <textarea value={crossBorderNotes} onChange={e => setCrossBorderNotes(e.target.value)} placeholder="例：貨物類型、件數、收件人資料" rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #FFB84D', background: '#FFFFFF', fontSize: 13, color: '#111827', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: 10, boxSizing: 'border-box' as const }} />
                    {/* Phase 7.5: File upload (stub — Phase 8 做真正 Firebase Storage 整合) */}
                    <div style={{ fontSize: 12, color: '#78350F', fontWeight: 600, marginBottom: 4 }}>文件上傳（選填）</div>
                    <label htmlFor="cb-attachments" style={{ display: 'block', padding: '10px 12px', borderRadius: 8, border: `1.5px dashed ${attachments.length >= 5 ? '#999' : '#FFB84D'}`, background: '#FFFFFF', textAlign: 'center', cursor: attachments.length >= 5 ? 'not-allowed' : 'pointer', fontSize: 13, color: attachments.length >= 5 ? '#999' : '#92400E' }}>
                      ⬆ {attachments.length >= 5 ? '已達上限 (5 個)' : '點擊選擇檔案（PDF / JPG / PNG, max 10MB）'}
                      <input
                        id="cb-attachments"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        multiple
                        disabled={attachments.length >= 5}
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          const valid = files.filter(f => f.size <= 10 * 1024 * 1024 && /pdf|jpe?g|png/i.test(f.type));
                          if (files.length !== valid.length) showNotification({ title: '部分檔案無效', body: '只接受 PDF / JPG / PNG, max 10MB', type: 'error' });
                          setAttachments(prev => [...prev, ...valid.map(f => ({ fileName: f.name, sizeBytes: f.size, mimeType: f.type }))].slice(0, 5));
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {attachments.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        {attachments.map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {a.fileName}</span>
                            <span style={{ color: '#78350F', marginRight: 8 }}>{(a.sizeBytes / 1024).toFixed(0)} KB</span>
                            <span onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', fontSize: 16, color: '#92400E' }}>×</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px' }}>選擇車輛</div>
                {(['motorcycle', 'light', 'van_7', 'truck_5_5t', 'truck_9_5t', 'sedan'] as VehicleType[]).map(vt => {
                  const cap = VEHICLE_TYPE_CAPACITY[vt];
                  const base: Record<VehicleType, number> = { motorcycle: 80, light: 180, van_7: 220, truck_5_5t: 280, truck_9_5t: 420, sedan: 150 };
                  const price = (base[vt] || 200) + Math.round(distanceKm * 8);
                  const selected = vehicleType === vt;
                  return (
                    <div key={vt} onClick={() => setVehicleType(vt)} style={{ display: 'flex', alignItems: 'center', padding: 12, background: selected ? colors.brandLight : colors.surface, border: `1.5px solid ${selected ? colors.brand : colors.border}`, borderRadius: 14, marginBottom: 8, cursor: 'pointer', minHeight: 64 }}>
                      <div style={{ width: 44, height: 44, background: colors.background, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, fontSize: 24 }}>{VEHICLE_TYPE_EMOJI[vt]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{VEHICLE_TYPE_LABELS[vt]}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{cap?.desc}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, marginLeft: 12 }}>${price}</div>
                    </div>
                  );
                })}
              </>
            )}

            <div style={{ position: 'sticky', bottom: 0, background: `linear-gradient(to top, ${colors.surface} 80%, transparent)`, paddingTop: 12, paddingBottom: 8, marginTop: 12, boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
              <button onClick={handleSubmit} disabled={!endCoord || submitting} style={{ width: '100%', background: endCoord && !submitting ? colors.brand : colors.border, color: endCoord && !submitting ? colors.textPrimary : colors.textMuted, border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 700, cursor: endCoord && !submitting ? 'pointer' : 'not-allowed', minHeight: 52 }}>
                {submitting ? '提交中...' : `確認落單 $${estimatedPrice} →`}
              </button>
            </div>
            {/* Phase 7.4: Show surcharge inline if cross-border */}
            {serviceType === 'cross_border' && endCoord && (() => {
              const port = CROSS_BORDER_CHECKPOINTS.find(cp => cp.value === crossBorderCheckpoint);
              if (!port || port.fee === 0) return null;
              return (
                <div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  已包 ${port.fee} {port.label}口岸附加費
                </div>
              );
            })()}
            <div style={{ marginTop: 16, padding: 12, background: colors.background, borderRadius: 10, fontSize: 12, color: colors.textMuted, lineHeight: 1.6 }}>
              <strong style={{ color: colors.textSecondary }}>Phase 3 ✓:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>兩點齊 → 顯示 route info (Haversine + 假定 24 km/h)</li>
                <li>揀車 → 3 種 van size 連 emoji + 描述 + 價錢</li>
                <li>確認 → createBooking() → Firestore + redirect /trips</li>
                <li>Loading state + error handling</li>
              </ul>
            </div>
          </div>
        )}

        {isFullSheet && (
          <div style={{ padding: '8px 16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 12px' }}>
              <button onClick={cancelSearch} style={{ width: 36, height: 36, borderRadius: '50%', background: colors.background, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>←</button>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={sheetMode === 'searching-start' ? '搜尋起點地址' : sheetMode === 'searching-waypoint' ? '搜尋中途站' : '搜尋終點地址'}
                style={{ flex: 1, background: colors.background, border: 'none', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: colors.textPrimary, outline: 'none', fontFamily: 'inherit' }}
              />
              <span onClick={cancelSearch} style={{ fontSize: 14, color: colors.brand, fontWeight: 600, cursor: 'pointer' }}>取消</span>
            </div>

            {!query.trim() && (
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '16px 8px 6px' }}>提示</div>
            )}
            {!query.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12, cursor: 'pointer', borderRadius: 12 }} onClick={() => handleMapClick({ latLng: new google.maps.LatLng(startCoord.lat, startCoord.lng) } as google.maps.MapMouseEvent)}>
                <div style={{ width: 40, height: 40, background: colors.background, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📍</div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>使用地圖揀選</div>
              </div>
            )}

            {searching && (
              <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>搜尋中...</div>
            )}

            {!searching && query.trim() && results.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>冇結果。試下其他關鍵字。</div>
            )}

            {results.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 8px 6px' }}>搜尋結果 ({results.length})</div>
                {results.map(r => (
                  <div key={r.placeId} onClick={() => handleSelect(r)} style={{ display: 'flex', alignItems: 'center', padding: 12, gap: 12, cursor: 'pointer', borderRadius: 12, minHeight: 56 }}>
                    <div style={{ width: 40, height: 40, background: colors.background, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📍</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.mainText}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.secondaryText || r.description}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {isPeek && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>拖動地圖重新確認終點</div>
            <div style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 600, marginBottom: 10, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pendingLabel || '選擇位置...'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPendingCoord(null); setPendingLabel(null); setSheetMode('idle'); }} style={{ flex: 1, background: colors.surface, color: colors.textPrimary, border: `1.5px solid ${colors.border}`, borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={() => {
                if (pendingCoord) {
                  setEndCoord(pendingCoord);
                  setEndLabel(pendingLabel);
                }
                // Fix D: always clear pending + transition to idle, regardless of pendingCoord.
                // Defensive: if for any reason pendingCoord is null but we are in peek mode,
                // still exit peek mode to avoid dead-end.
                setPendingCoord(null);
                setPendingLabel(null);
                setSheetMode('idle');
              }} style={{ flex: 2, background: colors.brand, color: colors.textPrimary, border: 'none', borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                ✓ 確認
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
