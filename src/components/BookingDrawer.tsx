import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { colors, sp, rd } from '../styles';
import { calculateFare, formatFare } from '../utils/pricing';
import type { VehicleType } from '../types';
import { createBooking } from '../services/bookings';
import { useAuth } from '../context/AuthContext';
import { getPlaceSuggestions, reverseGeocode } from '../pages/HomePage';
import type { PlaceSuggestion } from '../pages/HomePage';

const HK_CENTER = { lat: 22.3193, lng: 114.1694 };
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

export type ServiceTab = 'delivery' | 'move' | 'business';
type LoadSize = 'small' | 'medium' | 'large';
type TimeMode = 'now' | '4hour' | 'sameday' | 'scheduled';

interface SheetData {
  pickup: string;
  pickupCoord: [number, number] | null;
  dropoff: string;
  dropoffCoord: [number, number] | null;
  extraStops: string[];
  extraStopsCoord: [number, number][];
  service: ServiceTab;
  time: TimeMode;
  scheduledTime?: Date;
  vehicleType: VehicleType;
  loadType: LoadSize;
  passengerCount: number;
  notes: string;
  isCrossBorder: boolean;
}

const DEFAULT_DATA: SheetData = {
  pickup: '', pickupCoord: null,
  dropoff: '', dropoffCoord: null,
  extraStops: [], extraStopsCoord: [],
  service: 'delivery',
  time: 'now',
  vehicleType: 'motorcycle',
  loadType: 'small',
  passengerCount: 1,
  notes: '',
  isCrossBorder: false,
};

const SERVICE_SPEED = [
  { key: 'now' as TimeMode, label: '即時', surcharge: '+30%' },
  { key: '4hour' as TimeMode, label: '4小時', surcharge: '' },
  { key: 'sameday' as TimeMode, label: '即日', surcharge: '9折' },
  { key: 'scheduled' as TimeMode, label: '預約', surcharge: '' },
];

// Vehicle options per service
const VEHICLE_OPTIONS: Record<ServiceTab, { type: VehicleType; icon: string; label: string; sub: string }[]> = {
  delivery: [
    { type: 'motorcycle', icon: '🏍️', label: '電單車', sub: '~50kg' },
    { type: 'light', icon: '🚚', label: '輕型貨車', sub: '~1000kg' },
  ],
  move: [
    { type: 'light', icon: '🚚', label: '輕型貨車', sub: 'HiAce/TownAce' },
    { type: 'truck_5_5t', icon: '🚛', label: '5.5噸', sub: '大型貨運' },
    { type: 'truck_9_5t', icon: '🚜', label: '9.5噸', sub: '超大型貨運' },
  ],
  business: [
    { type: 'van_7', icon: '🚗', label: '商務七人車', sub: '機場·跨境接送' },
  ],
};

const LOAD_OPTIONS: { type: LoadSize; icon: string; label: string }[] = [
  { type: 'small', icon: '📦', label: '小件' },
  { type: 'medium', icon: '🧳', label: '中件' },
  { type: 'large', icon: '🚢', label: '大件' },
];

// ─── Address Input ───────────────────────────────────────────────────────────
function AddressInput({ value, onChange, onSelect, placeholder, borderColor }: {
  value: string; onChange: (v: string) => void; onSelect: (addr: string, coord: [number, number]) => void; placeholder: string; borderColor: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (v.length < 2) { setResults([]); setShowResults(false); return; }
      const suggestions = await getPlaceSuggestions(v);
      setResults(suggestions);
      setShowResults(suggestions.length > 0 && isFocused);
      setShowResults(true); // Always show if we have results, regardless of focus state
    }, 150);
  };

  const handleSelect = (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.description);
    onChange(suggestion.description);
    onSelect(suggestion.description, [suggestion.lat, suggestion.lon]);
    setShowResults(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
      <input
        style={{
          width: '100%',
          border: `2px solid ${isFocused ? borderColor : '#e4e7ec'}`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 15,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: colors.darkGrey,
          background: '#fff',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}
        placeholder={placeholder}
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { setIsFocused(true); if (results.length > 0) setShowResults(true); }}
        onBlur={() => { setIsFocused(false); setTimeout(() => setShowResults(false), 300); }}
      />
      {results.length > 0 && showResults && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', borderRadius: rd.md, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000, maxHeight: 200, overflow: 'auto', marginTop: 4,
        }}>
          {results.map((r, i) => (
            <div key={i} onMouseDown={e => { e.preventDefault(); handleSelect(r); }} onTouchEnd={e => { e.preventDefault(); handleSelect(r); }} style={{ padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer', touchAction: 'manipulation' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.darkGrey }}>{r.mainText}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{r.secondaryText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main BookingDrawer ─────────────────────────────────────────────────────
interface BookingDrawerProps {
  onClose: () => void;
}

export default function BookingDrawer({ onClose }: BookingDrawerProps) {
  const { user } = useAuth();
  const [data, setData] = useState<SheetData>(DEFAULT_DATA);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [newStop, setNewStop] = useState('');
  const [showStopInput, setShowStopInput] = useState(false);
  const [panelVh, setPanelVh] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  // Map center adjustment mode — 'pickup' | 'dropoff' | 'stop:0' | 'stop:1' | 'stop:2' | null
  const [adjustingField, setAdjustingField] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startVh: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const isHK = (lat: number, lng: number) => lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5;

  // ─── Map center adjustment overlay ───────────────────────────────────────
  useEffect(() => {
    const container = document.getElementById('booking-map');
    if (!container) return;

    // Remove existing overlay
    const existing = document.getElementById('map-adjust-overlay');
    if (existing) existing.remove();

    if (!adjustingField) return;

    const overlay = document.createElement('div');
    overlay.id = 'map-adjust-overlay';
    overlay.style.cssText = `
      position: absolute; inset: 0; z-index: 400; pointer-events: none;
    `;

    // Crosshair SVG — position in upper half of screen (above drawer)
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute; top: 22%; left: 50%;
      transform: translate(-50%, -50%);
      width: 70px; height: 70px;
    `;
    crosshair.innerHTML = `
      <svg viewBox="0 0 60 60" style="width:100%;height:100%">
        <line x1="30" y1="0" x2="30" y2="22" stroke="#c3ea4f" stroke-width="2.5"/>
        <line x1="30" y1="38" x2="30" y2="60" stroke="#c3ea4f" stroke-width="2.5"/>
        <line x1="0" y1="30" x2="22" y2="30" stroke="#c3ea4f" stroke-width="2.5"/>
        <line x1="38" y1="30" x2="60" y2="30" stroke="#c3ea4f" stroke-width="2.5"/>
        <circle cx="30" cy="30" r="12" fill="none" stroke="#c3ea4f" stroke-width="2.5"/>
        <circle cx="30" cy="30" r="4" fill="#c3ea4f"/>
      </svg>
    `;
    overlay.appendChild(crosshair);

    // Hint text
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute; top: 10%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.75); color: #fff; padding: 10px 18px;
      border-radius: 24px; font-size: 14px; font-weight: 600;
      white-space: nowrap; font-family: Inter, system-ui, sans-serif;
    `;
    hint.textContent = '拖地圖到想要的位置，再確認';
    overlay.appendChild(hint);

    // Button container (pointer-events: auto)
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: absolute; top: 38%; left: 50%; transform: translateX(-50%);
      display: flex; gap: 14px; pointer-events: auto;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `
      background: #fff; border: 2px solid #e4e7ec; border-radius: 14px;
      padding: 12px 22px; font-size: 15px; font-weight: 600;
      color: #333; cursor: pointer; font-family: Inter, system-ui, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    cancelBtn.textContent = '✕ 取消';
    cancelBtn.onclick = () => setAdjustingField(null);

    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = `
      background: #c3ea4f; border: none; border-radius: 14px;
      padding: 12px 22px; font-size: 15px; font-weight: 700;
      color: #222; cursor: pointer; font-family: Inter, system-ui, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    confirmBtn.textContent = '✓ 確認位置';
    confirmBtn.onclick = async () => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      if (!center) return;
      const lat = center.lat();
      const lng = center.lng();
      const addr = await reverseGeocode(lat, lng);
      if (adjustingField === 'pickup') {
        setData(p => ({ ...p, pickupCoord: [lat, lng], pickup: addr }));
      } else if (adjustingField === 'dropoff') {
        const pc = data.pickupCoord;
        if (pc) {
          const crossBorder = isHK(pc[0], pc[1]) !== isHK(lat, lng);
          setData(p => ({ ...p, dropoffCoord: [lat, lng], dropoff: addr, isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
        } else {
          setData(p => ({ ...p, dropoffCoord: [lat, lng], dropoff: addr }));
        }
      } else if (adjustingField?.startsWith('stop:')) {
        const idx = parseInt(adjustingField.split(':')[1]);
        const newStops = [...data.extraStops];
        const newCoords = [...data.extraStopsCoord];
        newStops[idx] = addr;
        newCoords[idx] = [lat, lng];
        setData(p => ({ ...p, extraStops: newStops, extraStopsCoord: newCoords }));
      }
      setAdjustingField(null);
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    overlay.appendChild(btnContainer);

    container.style.position = 'relative';
    container.appendChild(overlay);
    overlayRef.current = overlay;

    return () => { if (overlay.parentNode) overlay.remove(); };
  }, [adjustingField, data.pickupCoord, data.dropoffCoord, data.extraStops, data.extraStopsCoord]);

  // ─── Auto-detect user location on mount ─────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addr = await reverseGeocode(latitude, longitude);
        setData(p => ({ ...p, pickup: addr, pickupCoord: [latitude, longitude] }));
        setLocationLoading(false);
        panToCoord([latitude, longitude]);
      },
      () => { setLocationLoading(false); },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // ─── Fare calculation ─────────────────────────────────────────────────────
  const fare = useMemo(() => {
    if (!data.pickupCoord || !data.dropoffCoord) return null;
    return calculateFare({
      pickupCoord: data.pickupCoord,
      dropoffCoord: data.dropoffCoord,
      vehicleType: data.vehicleType,
      speed: data.time === 'now' ? 'immediate' : data.time === '4hour' ? '4hour' : data.time === 'sameday' ? 'sameday' : 'scheduled',
      scheduledTime: data.scheduledTime,
      extraStops: data.extraStops.length,
      loadSize: data.loadType,
      loadWeight: (data.loadType === 'small' ? 'light' : data.loadType === 'medium' ? 'medium' : 'heavy') as 'light' | 'medium' | 'heavy',
      hasInsurance: false,
      hasAssistant: false,
    });
  }, [data.pickupCoord, data.dropoffCoord, data.vehicleType, data.time, data.scheduledTime, data.extraStops.length, data.loadType]);

  // ─── Route coords ─────────────────────────────────────────────────────────
  // Include all stops for complete route (use actual coordinates, not interpolated)
  const allRoutePoints = useMemo(() => {
    if (!data.pickupCoord || !data.dropoffCoord) return [];
    const points: [number, number][] = [data.pickupCoord];
    data.extraStopsCoord.forEach(c => { if (c[0] !== 0 || c[1] !== 0) points.push(c); });
    points.push(data.dropoffCoord);
    return points;
  }, [data.pickupCoord, data.dropoffCoord, data.extraStopsCoord]);

  // Pan map to a single coordinate with smooth animation
  // Account for drawer covering bottom ~55% of screen, so center slightly above middle
  const panToCoord = useCallback((coord: [number, number]) => {
    if (!mapRef.current) return;
    const point = mapRef.current.getProjection()?.fromLatLngToPoint({ lat: coord[0], lng: coord[1] });
    if (point) {
      // Offset: shift point up by ~25% of screen height so it sits above the drawer
      const screenH = window.innerHeight;
      const offsetPx = -screenH * 0.18;
      const newCenter = mapRef.current.getProjection()?.fromPointToLatLng(
        new google.maps.Point(point.x, point.y + offsetPx)
      );
      if (newCenter) mapRef.current.panTo(newCenter);
      else mapRef.current.panTo({ lat: coord[0], lng: coord[1] });
    } else {
      mapRef.current.panTo({ lat: coord[0], lng: coord[1] });
    }
    mapRef.current.setZoom(14);
  }, []);

  // Map fit when route changes — show all waypoints with animation
  // Account for drawer covering bottom ~55% of screen
  useEffect(() => {
    if (!mapRef.current || !data.pickupCoord || !data.dropoffCoord || allRoutePoints.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: data.pickupCoord[0], lng: data.pickupCoord[1] });
    bounds.extend({ lat: data.dropoffCoord[0], lng: data.dropoffCoord[1] });
    data.extraStopsCoord.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    // top=80 for header, bottom=600 for drawer (55% of ~812px phone height)
    mapRef.current.fitBounds(bounds, { top: 80, bottom: 600, left: 20, right: 20 });
  }, [allRoutePoints, data.pickupCoord, data.dropoffCoord, data.extraStopsCoord]);

  // ─── Vehicle options by service ──────────────────────────────────────────
  const vehicleOptions = VEHICLE_OPTIONS[data.service] || VEHICLE_OPTIONS.delivery;

  // ─── Service change ────────────────────────────────────────────────────────
  const handleServiceChange = (service: ServiceTab) => {
    const defaultVehicle: Record<ServiceTab, VehicleType> = {
      delivery: 'motorcycle',
      move: 'light',
      business: 'van_7',
    };
    setData(p => ({ ...p, service, vehicleType: defaultVehicle[service] }));
  };

  // ─── Address selection → cross-border detection ───────────────────────────
  const handlePickupSelect = (addr: string, coord: [number, number]) => {
    setData(p => ({ ...p, pickup: addr, pickupCoord: coord }));
    panToCoord(coord);
    if (data.dropoffCoord) {
      const crossBorder = isHK(coord[0], coord[1]) !== isHK(data.dropoffCoord[0], data.dropoffCoord[1]);
      setData(p => ({ ...p, isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
    }
  };

  const handleDropoffSelect = (addr: string, coord: [number, number]) => {
    setData(p => ({ ...p, dropoff: addr, dropoffCoord: coord }));
    panToCoord(coord);
    if (data.pickupCoord) {
      const crossBorder = isHK(data.pickupCoord[0], data.pickupCoord[1]) !== isHK(coord[0], coord[1]);
      setData(p => ({ ...p, isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
    }
  };

  // ─── Map click → set address ──────────────────────────────────────────────
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const addr = await reverseGeocode(lat, lng);
    if (!data.pickupCoord) {
      setData(p => ({ ...p, pickupCoord: [lat, lng], pickup: addr }));
      panToCoord([lat, lng]);
    } else if (!data.dropoffCoord) {
      const crossBorder = isHK(data.pickupCoord[0], data.pickupCoord[1]) !== isHK(lat, lng);
      setData(p => ({ ...p, dropoffCoord: [lat, lng], dropoff: addr, isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
      panToCoord([lat, lng]);
    } else if (data.extraStops.length < 3) {
      setData(p => ({ ...p, extraStops: [...p.extraStops, addr], extraStopsCoord: [...p.extraStopsCoord, [lat, lng]] }));
      panToCoord([lat, lng]);
    }
  }, [data.pickupCoord, data.dropoffCoord, data.extraStops.length, panToCoord]);

  // ─── Marker drag end → update address ─────────────────────────────────────
  const handleMarkerDragEnd = useCallback(async (which: 'pickup' | 'dropoff' | 'stop', lat: number, lng: number) => {
    const addr = await reverseGeocode(lat, lng);
    if (which === 'pickup') {
      setData(p => ({ ...p, pickupCoord: [lat, lng], pickup: addr }));
    } else if (which === 'dropoff') {
      const pickupCoord = data.pickupCoord;
      if (pickupCoord) {
        const crossBorder = isHK(pickupCoord[0], pickupCoord[1]) !== isHK(lat, lng);
        setData(p => ({ ...p, dropoffCoord: [lat, lng], dropoff: addr, isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
      }
    }
  }, [data.pickupCoord]);

  // Overload for stop with index
  const handleStopDragEnd = useCallback(async (idx: number, lat: number, lng: number) => {
    const addr = await reverseGeocode(lat, lng);
    const newStops = [...data.extraStops];
    const newCoords = [...data.extraStopsCoord];
    newStops[idx] = addr;
    newCoords[idx] = [lat, lng];
    setData(p => ({ ...p, extraStops: newStops, extraStopsCoord: newCoords }));
  }, [data.extraStops, data.extraStopsCoord]);

  // ─── Drag handlers ────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragRef.current = { startY: e.clientY, startVh: panelVh };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY;
    const dvh = (dy / window.innerHeight) * 100;
    setPanelVh(Math.max(35, Math.min(90, dragRef.current.startVh + dvh)));
  };
  const onPointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  // ─── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!user?.uid || !data.pickupCoord || !data.dropoffCoord) return;
    try {
      await createBooking({
        renterId: user.uid,
        pickupAddress: data.pickup,
        pickupLat: data.pickupCoord[0],
        pickupLng: data.pickupCoord[1],
        dropoffAddress: data.dropoff,
        dropoffLat: data.dropoffCoord[0],
        dropoffLng: data.dropoffCoord[1],
        waypoints: data.extraStops.map((addr, i) => ({ address: addr, lat: data.extraStopsCoord[i]?.[0] ?? 0, lng: data.extraStopsCoord[i]?.[1] ?? 0 })),
        vehicleTypeRequired: data.vehicleType,
        pickupTime: data.time === 'now' ? new Date().toISOString() : (data.scheduledTime?.toISOString() ?? new Date().toISOString()),
        loads: [{ type: data.loadType, count: 1 }],
        totalLoadCount: 1,
        loadDescription: '',
        notes: data.notes,
      });
      setPublishSuccess(true);
      setData(DEFAULT_DATA);
      setTimeout(() => { setPublishSuccess(false); onClose(); }, 2500);
    } catch (e) { console.error(e); }
  };

  const canPublish = data.pickupCoord && data.dropoffCoord && data.vehicleType;
  const isCollapsed = panelVh < 50;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#111' }}>
      {/* Google Map */}
      <GoogleMap
        id="booking-map"
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={HK_CENTER}
        zoom={12}
        onLoad={node => { mapRef.current = node; }}
        options={{ styles: MAP_STYLE, disableDefaultUI: true, zoomControl: true }}
        onClick={e => handleMapClick((e as google.maps.MapMouseEvent).latLng!.lat(), (e as google.maps.MapMouseEvent).latLng!.lng())}
      >
        {data.pickupCoord && (
          <Marker position={{ lat: data.pickupCoord[0], lng: data.pickupCoord[1] }}
            draggable onDragEnd={e => { const lat = e.latLng!.lat(); const lng = e.latLng!.lng(); handleMarkerDragEnd('pickup', lat, lng); }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: colors.primaryBlue, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }} />
        )}
        {data.dropoffCoord && (
          <Marker position={{ lat: data.dropoffCoord[0], lng: data.dropoffCoord[1] }}
            draggable onDragEnd={e => { const lat = e.latLng!.lat(); const lng = e.latLng!.lng(); handleMarkerDragEnd('dropoff', lat, lng); }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: colors.orange, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }} />
        )}
        {data.extraStopsCoord.map((c, i) => (
          c[0] !== 0 && <Marker key={i} position={{ lat: c[0], lng: c[1] }}
            draggable onDragEnd={e => { const lat = e.latLng!.lat(); const lng = e.latLng!.lng(); handleStopDragEnd(i, lat, lng); }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#FFD600', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }} />
        ))}
        {allRoutePoints.length > 1 && (
          <Polyline path={allRoutePoints.map(c => ({ lat: c[0], lng: c[1] }))}
            options={{ strokeColor: colors.primaryBlue, strokeOpacity: 0.8, strokeWeight: 4 }} />
        )}
      </GoogleMap>

      {/* Success toast */}
      {publishSuccess && (
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#22C55E', color: '#fff', padding: `${sp.sm}px ${sp.lg}px`,
          borderRadius: 9999, fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 600,
        }}>
          ✅ 訂單已發佈！
        </div>
      )}

      {/* Floating Drawer */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${panelVh}dvh`,
          background: colors.white,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: isDragging ? 'none' : 'height 0.2s ease',
          zIndex: 600,
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 52, cursor: 'grab', flexShrink: 0,
          borderBottom: `1px solid ${colors.lightGrey}`, background: '#FAFAFA',
          userSelect: 'none',
        }}>
          <div style={{ width: 52, height: 7, background: '#CBD5E1', borderRadius: 4, marginRight: 14 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: colors.darkGrey, letterSpacing: 0.3 }}>
            {isCollapsed ? '▲ 展開' : '▼ 收起'}
          </span>
        </div>

        {/* Header */}
        <div style={{ padding: `${sp.sm}px ${sp.md}px ${sp.xs}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: colors.darkGrey }}>📦 安排送貨</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: colors.textMuted, padding: '4px' }}>✕</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain', padding: `0 ${sp.md}px ${sp.md}px` }}>

          {/* ── Service Tabs ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: sp.xs }}>服務類型</div>
          <div style={{ display: 'flex', gap: sp.xs, marginBottom: sp.md }}>
            {([
              { key: 'delivery' as ServiceTab, icon: '📦', label: '速遞' },
              { key: 'move' as ServiceTab, icon: '🚚', label: '叫車' },
              { key: 'business' as ServiceTab, icon: '🚗', label: '商務' },
            ]).map(tab => (
              <div
                key={tab.key}
                onClick={() => handleServiceChange(tab.key)}
                style={{
                  flex: 1,
                  padding: `${sp.sm}px 4px`,
                  background: data.service === tab.key ? colors.primaryBlue : colors.lightGrey,
                  borderRadius: rd.md,
                  textAlign: 'center' as const,
                  cursor: 'pointer',
                  border: data.service === tab.key ? 'none' : '1.5px solid transparent',
                }}
              >
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: data.service === tab.key ? '#fff' : colors.darkGrey, marginTop: 2 }}>{tab.label}</div>
              </div>
            ))}
          </div>

          {/* ── Addresses ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: sp.xs }}>地址</div>

          {/* Pickup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, marginBottom: sp.xs }}>
            <AddressInput
              value={data.pickup}
              onChange={v => setData(p => ({ ...p, pickup: v, pickupCoord: v ? p.pickupCoord : null }))}
              onSelect={handlePickupSelect}
              placeholder={locationLoading ? '定位中...' : '起始點（取貨）'}
              borderColor={colors.primaryBlue}
            />
            {data.pickupCoord && (
              <button onClick={() => setData(p => ({ ...p, pickup: '', pickupCoord: null }))} style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: colors.textMuted, cursor: 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            )}
            {data.pickupCoord && (
              <button
                onClick={() => {
                  setAdjustingField('pickup');
                  const c = data.pickupCoord;
                  if (mapRef.current && c) {
                    mapRef.current.panTo({ lat: c[0], lng: c[1] });
                    mapRef.current.setZoom(15);
                  }
                }}
                title="微調位置"
                style={{ background: adjustingField === 'pickup' ? colors.primaryBlue : '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: adjustingField === 'pickup' ? '#fff' : colors.darkGrey, cursor: 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >📍</button>
            )}
          </div>

          {/* Add stop button (inline, between pickup and dropoff) */}
          {data.extraStops.length < 3 && (
            showStopInput ? (
              <div style={{ display: 'flex', gap: sp.xs, alignItems: 'center', marginBottom: '8px' }}>
                <AddressInput
                  value={newStop}
                  onChange={v => setNewStop(v)}
                  onSelect={(addr, coord) => {
                    setData(p => ({
                      ...p,
                      extraStops: [...p.extraStops, addr],
                      extraStopsCoord: [...p.extraStopsCoord, coord],
                    }));
                    panToCoord(coord);
                    setNewStop('');
                    setShowStopInput(false);
                  }}
                  placeholder="輸入中途站地址"
                  borderColor="#FFD700"
                />
                <button onClick={() => { setNewStop(''); setShowStopInput(false); }} style={{ background: 'none', border: 'none', fontSize: 12, color: colors.textMuted, cursor: 'pointer' }}>取消</button>
              </div>
            ) : (
              <button
                onClick={() => setShowStopInput(true)}
                style={{ background: 'none', border: `1.5px dashed ${colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.xs}px`, fontSize: 12, fontWeight: 600, color: colors.textMuted, cursor: 'pointer', width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                + 新增中途站
              </button>
            )
          )}

          {/* Extra stops list — shown between add stop button and dropoff */}
          {data.extraStops.map((stop, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: sp.sm, marginBottom: '6px', padding: '6px 8px', background: '#FFFDE7', borderRadius: 8, border: '1px solid #FFD70033' }}>
              <span style={{ fontSize: 11, color: '#FFD700', fontWeight: 700, minWidth: 16 }}>●</span>
              <span style={{ flex: 1, fontSize: 13, color: colors.darkGrey }}>{stop}</span>
              {/* Reorder buttons — larger touch targets for mobile */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const newStops = [...data.extraStops];
                    const newCoords = [...data.extraStopsCoord];
                    [newStops[i - 1], newStops[i]] = [newStops[i], newStops[i - 1]];
                    [newCoords[i - 1], newCoords[i]] = [newCoords[i], newCoords[i - 1]];
                    setData(p => ({ ...p, extraStops: newStops, extraStopsCoord: newCoords }));
                  }}
                  disabled={i === 0}
                  style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: i === 0 ? '#ccc' : colors.darkGrey, cursor: i === 0 ? 'not-allowed' : 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▲</button>
                <button
                  onClick={() => {
                    if (i === data.extraStops.length - 1) return;
                    const newStops = [...data.extraStops];
                    const newCoords = [...data.extraStopsCoord];
                    [newStops[i], newStops[i + 1]] = [newStops[i + 1], newStops[i]];
                    [newCoords[i], newCoords[i + 1]] = [newCoords[i + 1], newCoords[i]];
                    setData(p => ({ ...p, extraStops: newStops, extraStopsCoord: newCoords }));
                  }}
                  disabled={i === data.extraStops.length - 1}
                  style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: i === data.extraStops.length - 1 ? '#ccc' : colors.darkGrey, cursor: i === data.extraStops.length - 1 ? 'not-allowed' : 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▼</button>
              </div>
              <button onClick={() => setData(p => ({ ...p, extraStops: p.extraStops.filter((_, idx) => idx !== i), extraStopsCoord: p.extraStopsCoord.filter((_, idx) => idx !== i) }))} style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: colors.textMuted, cursor: 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <button
                onClick={() => {
                  const coord = data.extraStopsCoord[i];
                  if (coord && coord[0] !== 0) {
                    setAdjustingField(`stop:${i}`);
                    if (mapRef.current) {
                      mapRef.current.panTo({ lat: coord[0], lng: coord[1] });
                      mapRef.current.setZoom(15);
                    }
                  }
                }}
                title="微調位置"
                style={{ background: adjustingField === `stop:${i}` ? '#FFD700' : '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: adjustingField === `stop:${i}` ? '#fff' : colors.darkGrey, cursor: 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >📍</button>
            </div>
          ))}

          {/* Dropoff */}
          <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, marginBottom: sp.xs }}>
            <AddressInput
              value={data.dropoff}
              onChange={v => setData(p => ({ ...p, dropoff: v, dropoffCoord: v ? p.dropoffCoord : null }))}
              onSelect={handleDropoffSelect}
              placeholder="目的地（送貨）"
              borderColor={colors.orange}
            />
            {data.dropoffCoord && (
              <button onClick={() => setData(p => ({ ...p, dropoff: '', dropoffCoord: null }))} style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: colors.textMuted, cursor: 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            )}
            {data.dropoffCoord && (
              <button
                onClick={() => {
                  setAdjustingField('dropoff');
                  const c = data.dropoffCoord;
                  if (mapRef.current && c) {
                    mapRef.current.panTo({ lat: c[0], lng: c[1] });
                    mapRef.current.setZoom(15);
                  }
                }}
                title="微調位置"
                style={{ background: adjustingField === 'dropoff' ? colors.orange : '#fff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 14, color: adjustingField === 'dropoff' ? '#fff' : colors.darkGrey, cursor: 'pointer', padding: '6px 10px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >📍</button>
            )}
          </div>

          {/* ── Service Time ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.md, marginBottom: sp.xs }}>服務時間</div>
          <div style={{ display: 'flex', gap: sp.xs }}>
            {SERVICE_SPEED.map(opt => (
              <div
                key={opt.key}
                onClick={() => { setData(p => ({ ...p, time: opt.key })); if (opt.key === 'scheduled') setShowDatePicker(true); else setShowDatePicker(false); }}
                style={{
                  flex: 1,
                  background: data.time === opt.key ? colors.primaryBlue : colors.lightGrey,
                  borderRadius: rd.md,
                  padding: `${sp.sm}px 4px`,
                  textAlign: 'center' as const,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: data.time === opt.key ? '#fff' : colors.darkGrey }}>{opt.label}</span>
                {opt.surcharge && <div style={{ fontSize: 10, color: data.time === opt.key ? '#fff8' : colors.textMuted }}>{opt.surcharge}</div>}
              </div>
            ))}
          </div>
          {showDatePicker && (
            <div style={{ marginTop: sp.xs }}>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={e => { setScheduledDate(e.target.value); setData(p => ({ ...p, scheduledTime: new Date(e.target.value) })); }}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${colors.lightGrey}`, borderRadius: rd.md, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: colors.darkGrey, outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
          )}

          {/* ── Cargo Size (delivery only) ── */}
          {data.service === 'delivery' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.md, marginBottom: sp.xs }}>货物大小</div>
              <div style={{ display: 'flex', gap: sp.xs }}>
                {LOAD_OPTIONS.map(opt => (
                  <div
                    key={opt.type}
                    onClick={() => setData(p => ({ ...p, loadType: opt.type }))}
                    style={{
                      flex: 1,
                      background: data.loadType === opt.type ? '#E8F4FF' : colors.white,
                      border: `2px solid ${data.loadType === opt.type ? colors.primaryBlue : colors.lightGrey}`,
                      borderRadius: rd.md,
                      padding: `${sp.sm}px`,
                      textAlign: 'center' as const,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center' as const,
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: data.loadType === opt.type ? colors.primaryBlue : colors.darkGrey }}>{opt.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Vehicle Type ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.md, marginBottom: sp.xs }}>
            {data.service === 'delivery' ? '車型（根據货物推薦）' : '車型'}
          </div>
          <div style={{ display: 'flex', gap: sp.xs }}>
            {vehicleOptions.map(v => (
              <div
                key={v.type}
                onClick={() => setData(p => ({ ...p, vehicleType: v.type }))}
                style={{
                  flex: 1,
                  background: data.vehicleType === v.type ? '#E8F4FF' : colors.white,
                  border: `2px solid ${data.vehicleType === v.type ? colors.primaryBlue : colors.lightGrey}`,
                  borderRadius: rd.md,
                  padding: `${sp.md}px 4px`,
                  textAlign: 'center' as const,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center' as const,
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 28 }}>{v.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: data.vehicleType === v.type ? colors.primaryBlue : colors.darkGrey }}>{v.label}</span>
                <span style={{ fontSize: 10, color: colors.textMuted }}>{v.sub}</span>
              </div>
            ))}
          </div>

          {/* ── Passenger Count (move/business) ── */}
          {(data.service === 'move' || data.service === 'business') && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.md, marginBottom: sp.xs }}>乘客人數</div>
              <div style={{ display: 'flex', gap: sp.xs }}>
                {([1, 2, 3, 4] as const).map(n => (
                  <div
                    key={n}
                    onClick={() => setData(p => ({ ...p, passengerCount: n }))}
                    style={{
                      flex: 1,
                      background: data.passengerCount === n ? colors.primaryBlue : colors.lightGrey,
                      borderRadius: rd.md,
                      padding: `${sp.sm}px`,
                      textAlign: 'center' as const,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 800,
                      color: data.passengerCount === n ? '#fff' : colors.darkGrey,
                    }}
                  >
                    {n}人
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Notes ── */}
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.md, marginBottom: sp.xs }}>備注</div>
          <textarea
            style={{ width: '100%', minHeight: 60, border: `1.5px solid ${colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.sm}px`, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: colors.darkGrey, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
            placeholder="可填寫樓層、特殊货物等..."
            value={data.notes}
            maxLength={200}
            onChange={e => setData(p => ({ ...p, notes: e.target.value }))}
          />
          <div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 2 }}>{data.notes.length}/200</div>

          {/* ── Fare Card ── */}
          {fare && (
            <div style={{ background: '#F0F7FF', borderRadius: rd.lg, padding: sp.md, border: `1.5px solid ${colors.primaryBlue}22`, marginTop: sp.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>{fare.distanceKm}km · 約{fare.estimatedMinutes}分鐘</div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>估計總費</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: colors.primaryBlue, lineHeight: 1.1 }}>{formatFare(fare.total)}</div>
              </div>
            </div>
          )}

          {/* ── Confirm Button ── */}
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            style={{
              width: '100%',
              padding: `${sp.md}px`,
              background: canPublish ? colors.primaryBlue : colors.lightGrey,
              color: canPublish ? '#fff' : colors.textMuted,
              border: 'none',
              borderRadius: rd.lg,
              fontSize: 16,
              fontWeight: 800,
              cursor: canPublish ? 'pointer' : 'not-allowed',
              paddingBottom: `max(8px, env(safe-area-inset-bottom))`,
              marginTop: sp.md,
            }}
          >
            確認發佈 ✓
          </button>
        </div>
      </div>

    </div>
  );
}