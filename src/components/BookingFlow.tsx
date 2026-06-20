import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { toast } from 'sonner';
import { colors, sp, rd } from '../styles';
import { calculateFare, formatFare } from '../utils/pricing';
import type { VehicleType } from '../types';
import { createBooking } from '../services/bookings';
import { useAuth } from '../context/AuthContext';
import { getPlaceSuggestions, reverseGeocode } from '../pages/HomePage';
import type { PlaceSuggestion } from '../pages/HomePage';
import {
  IconMapPin, IconX, IconCheck, IconChevronUp, IconChevronDown,
  IconPackage, IconLuggage, IconShip, IconMotorcycle, IconTruck,
  IconLargeTruck, IconCar, IconArrowRight,
} from './Icon';

const HK_CENTER = { lat: 22.3193, lng: 114.1694 };

type FlowStep = 1 | 2 | 3 | 4;

interface FlowData {
  pickup: string;
  pickupCoord: [number, number] | null;
  dropoff: string;
  dropoffCoord: [number, number] | null;
  extraStops: string[];
  extraStopsCoord: [number, number][];
  service: 'delivery' | 'move' | 'business';
  vehicleType: VehicleType;
  time: 'now' | '4hour' | 'sameday' | 'scheduled';
  scheduledTime: Date | null;
  loadType: 'small' | 'medium' | 'large';
  isCrossBorder: boolean;
}

const DEFAULT_DATA: FlowData = {
  pickup: '',
  pickupCoord: null,
  dropoff: '',
  dropoffCoord: null,
  extraStops: [],
  extraStopsCoord: [],
  service: 'delivery',
  vehicleType: 'motorcycle',
  time: 'now',
  scheduledTime: null,
  loadType: 'small',
  isCrossBorder: false,
};

const MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

const SERVICE_TABS = [
  { key: 'delivery' as const, icon: <IconPackage size={18} />, label: '速遞' },
  { key: 'move' as const, icon: <IconTruck size={18} />, label: '叫車' },
  { key: 'business' as const, icon: <IconCar size={18} />, label: '商務' },
];

const VEHICLE_OPTIONS: Record<string, { type: VehicleType; icon: React.ReactNode; label: string; sub: string }[]> = {
  delivery: [
    { type: 'motorcycle', icon: <IconMotorcycle size={24} />, label: '電單車', sub: '~50kg' },
    { type: 'light', icon: <IconTruck size={24} />, label: '輕型貨車', sub: '~1000kg' },
  ],
  move: [
    { type: 'light', icon: <IconTruck size={24} />, label: '輕型貨車', sub: 'HiAce/TownAce' },
    { type: 'truck_5_5t', icon: <IconLargeTruck size={24} />, label: '5.5噸', sub: '大型貨運' },
    { type: 'truck_9_5t', icon: <IconLargeTruck size={24} />, label: '9.5噸', sub: '超大型貨運' },
  ],
  business: [
    { type: 'van_7', icon: <IconCar size={24} />, label: '商務七人車', sub: '機場·跨境接送' },
  ],
};

const LOAD_OPTIONS = [
  { type: 'small' as const, icon: <IconPackage size={20} />, label: '小件' },
  { type: 'medium' as const, icon: <IconLuggage size={20} />, label: '中件' },
  { type: 'large' as const, icon: <IconShip size={20} />, label: '大件' },
];

const TIME_OPTIONS = [
  { key: 'now' as const, label: '即時', surcharge: '' },
  { key: '4hour' as const, label: '4小時', surcharge: '+20%' },
  { key: 'sameday' as const, label: '同日', surcharge: '' },
  { key: 'scheduled' as const, label: '指定時間', surcharge: '' },
];

const isHK = (lat: number, lng: number) => lat >= 22.1 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5;

// ─── Search Input ────────────────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (addr: string, coord: [number, number]) => void;
  placeholder: string;
  icon?: React.ReactNode;
}

function SearchInput({ value, onChange, onSelect, placeholder, icon }: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (v.length < 2) { setResults([]); setShowResults(false); return; }
      const suggestions = await getPlaceSuggestions(v);
      setResults(suggestions);
      setShowResults(suggestions.length > 0);
    }, 150);
  };

  const handleSelect = (s: PlaceSuggestion) => {
    onChange(s.description);
    onSelect(s.description, [s.lat, s.lon]);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', border: `2px solid ${isFocused ? colors.primaryBlue : '#e4e7ec'}`,
        borderRadius: rd.full, padding: '10px 14px',
        transition: 'border-color 0.15s',
      }}>
        {icon && <span style={{ display: 'flex', alignItems: 'center', color: colors.primaryBlue }}>{icon}</span>}
        <input
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: 'Inter, system-ui, sans-serif', color: colors.darkGrey, background: 'transparent', boxSizing: 'border-box' }}
          placeholder={placeholder}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setIsFocused(true); if (results.length > 0) setShowResults(true); }}
          onBlur={() => { setIsFocused(false); setTimeout(() => setShowResults(false), 300); }}
        />
        {value && (
          <button onClick={() => { onChange(''); setResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
            <IconX size={16} color={colors.textMuted} />
          </button>
        )}
      </div>
      {results.length > 0 && showResults && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: rd.md, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, maxHeight: 200, overflow: 'auto', marginTop: 4 }}>
          {results.map((r, i) => (
            <div key={i} onMouseDown={e => { e.preventDefault(); handleSelect(r); }} style={{ padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.darkGrey }}>{r.mainText}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{r.secondaryText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main BookingFlow ─────────────────────────────────────────────────────────
interface BookingFlowProps {
  onClose: () => void;
}

export default function BookingFlow({ onClose }: BookingFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>(1);
  const [data, setData] = useState<FlowData>(DEFAULT_DATA);
  const [panelVh, setPanelVh] = useState(42);
  const [isDragging, setIsDragging] = useState(false);
  const [longPressPoint, setLongPressPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ startY: number; startVh: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // ─── Auto-detect location on mount ───────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addr = await reverseGeocode(latitude, longitude);
        setData(p => ({ ...p, pickup: addr, pickupCoord: [latitude, longitude] }));
        panToCoord([latitude, longitude]);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // ─── Keyboard show/hide → collapse ───────────────────────────────────
  useEffect(() => {
    let lastH = window.innerHeight;
    const onResize = () => {
      const h = window.innerHeight;
      if (h < lastH - 80) setPanelVh(38);
      lastH = h;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Fare ───────────────────────────────────────────────────────────────
  const fare = useMemo(() => {
    if (!data.pickupCoord || !data.dropoffCoord) return null;
    return calculateFare({
      pickupCoord: data.pickupCoord,
      dropoffCoord: data.dropoffCoord,
      vehicleType: data.vehicleType,
      speed: data.time === 'now' ? 'immediate' : data.time === '4hour' ? '4hour' : data.time === 'sameday' ? 'sameday' : 'scheduled',
      scheduledTime: data.scheduledTime ?? undefined,
      extraStops: data.extraStops.length,
      loadSize: data.loadType,
      loadWeight: (data.loadType === 'small' ? 'light' : data.loadType === 'medium' ? 'medium' : 'heavy') as 'light' | 'medium' | 'heavy',
      hasInsurance: false,
      hasAssistant: false,
    });
  }, [data.pickupCoord, data.dropoffCoord, data.vehicleType, data.time, data.scheduledTime, data.extraStops.length, data.loadType]);

  // ─── Route points ───────────────────────────────────────────────────────
  const allRoutePoints = useMemo(() => {
    if (!data.pickupCoord || !data.dropoffCoord) return [];
    const points: [number, number][] = [data.pickupCoord];
    data.extraStopsCoord.forEach(c => { if (c[0] !== 0 || c[1] !== 0) points.push(c); });
    points.push(data.dropoffCoord);
    return points;
  }, [data.pickupCoord, data.dropoffCoord, data.extraStopsCoord]);

  // ─── Map helpers ─────────────────────────────────────────────────────────
  const panToCoord = useCallback((coord: [number, number]) => {
    if (!mapRef.current) return;
    try {
      const projection = mapRef.current.getProjection();
      if (projection) {
        const point = projection.fromLatLngToPoint({ lat: coord[0], lng: coord[1] });
        if (point) {
          const screenH = window.innerHeight;
          const offsetPx = -screenH * 0.18;
          const newCenter = projection.fromPointToLatLng(
            new google.maps.Point(point.x, point.y + offsetPx)
          );
          if (newCenter) {
            mapRef.current.panTo(newCenter);
            mapRef.current.setZoom(14);
            return;
          }
        }
      }
      // Fallback: simple pan
      mapRef.current.panTo({ lat: coord[0], lng: coord[1] });
      mapRef.current.setZoom(14);
    } catch (err) {
      // Safely ignore map pan errors
      console.warn('Map pan error:', err);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !data.pickupCoord || !data.dropoffCoord || allRoutePoints.length < 2) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: data.pickupCoord[0], lng: data.pickupCoord[1] });
      bounds.extend({ lat: data.dropoffCoord[0], lng: data.dropoffCoord[1] });
      data.extraStopsCoord.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      mapRef.current.fitBounds(bounds, { top: 80, bottom: panelVh > 50 ? 500 : 200, left: 20, right: 20 });
    } catch (err) {
      console.warn('Map fitBounds error:', err);
    }
  }, [allRoutePoints, data.pickupCoord, data.dropoffCoord, data.extraStopsCoord, panelVh]);

  // ─── Drag ───────────────────────────────────────────────────────────────
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

  // ─── Long-press on map ──────────────────────────────────────────────────
  const handleMapLongPress = useCallback(async (lat: number, lng: number) => {
    setLongPressPoint({ lat, lng });
  }, []);

  // ─── Pickup select ──────────────────────────────────────────────────────
  const handlePickupSelect = (addr: string, coord: [number, number]) => {
    setData(p => ({ ...p, pickup: addr, pickupCoord: coord }));
    panToCoord(coord);
  };

  // ─── Dropoff select ──────────────────────────────────────────────────────
  const handleDropoffSelect = (addr: string, coord: [number, number]) => {
    setData(p => ({ ...p, dropoff: addr, dropoffCoord: coord }));
    panToCoord(coord);
    if (data.pickupCoord) {
      const crossBorder = isHK(data.pickupCoord[0], data.pickupCoord[1]) !== isHK(coord[0], coord[1]);
      setData(p => ({ ...p, isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
    }
  };

  // ─── Publish ────────────────────────────────────────────────────────────
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
        notes: '',
      });
      toast.success('✅ 訂單已發佈！');
      setData(DEFAULT_DATA);
      setTimeout(() => onClose(), 2500);
    } catch (e) {
      toast.error('發佈失敗，請重試');
    }
  };

  const canPublish = data.pickupCoord && data.dropoffCoord && data.vehicleType;
  const vehicleOptions = VEHICLE_OPTIONS[data.service] || VEHICLE_OPTIONS.delivery;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#111' }}>
      {/* ── Google Map ── */}
      <GoogleMap
        id="booking-flow-map"
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={HK_CENTER}
        zoom={12}
        onLoad={node => { mapRef.current = node; console.log('BookingFlow map loaded'); }}
        options={{ styles: MAP_STYLE, disableDefaultUI: true, zoomControl: true }}
        onClick={(e) => {
          try {
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            const latLng = (e as google.maps.MapMouseEvent).latLng;
            if (!latLng) return;
            longPressTimer.current = setTimeout(() => {
              handleMapLongPress(latLng.lat(), latLng.lng());
            }, 600);
            setTimeout(() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            }, 650);
          } catch (err) {
            console.warn('Map click error:', err);
          }
        }}
      >
        {data.pickupCoord && (
          <Marker position={{ lat: data.pickupCoord[0], lng: data.pickupCoord[1] }}
            draggable onDragEnd={e => {
              const lat = e.latLng!.lat(), lng = e.latLng!.lng();
              reverseGeocode(lat, lng).then(addr => setData(p => ({ ...p, pickup: addr, pickupCoord: [lat, lng] })));
            }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: colors.primaryBlue, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }}
          />
        )}
        {data.dropoffCoord && (
          <Marker position={{ lat: data.dropoffCoord[0], lng: data.dropoffCoord[1] }}
            draggable onDragEnd={e => {
              const lat = e.latLng!.lat(), lng = e.latLng!.lng();
              reverseGeocode(lat, lng).then(addr => {
                const pc = data.pickupCoord;
                if (pc) {
                  const crossBorder = isHK(pc[0], pc[1]) !== isHK(lat, lng);
                  setData(p => ({ ...p, dropoff: addr, dropoffCoord: [lat, lng], isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
                } else {
                  setData(p => ({ ...p, dropoff: addr, dropoffCoord: [lat, lng] }));
                }
              });
            }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: colors.orange, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }}
          />
        )}
        {data.extraStopsCoord.map((c, i) => (
          c[0] !== 0 && <Marker key={i} position={{ lat: c[0], lng: c[1] }}
            draggable onDragEnd={e => {
              const lat = e.latLng!.lat(), lng = e.latLng!.lng();
              reverseGeocode(lat, lng).then(addr => {
                const newStops = [...data.extraStops]; newStops[i] = addr;
                const newCoords = [...data.extraStopsCoord]; newCoords[i] = [lat, lng];
                setData(p => ({ ...p, extraStops: newStops, extraStopsCoord: newCoords }));
              });
            }}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#FFD600', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }}
          />
        ))}
        {allRoutePoints.length > 1 && (
          <Polyline path={allRoutePoints.map(c => ({ lat: c[0], lng: c[1] }))}
            options={{ strokeColor: colors.primaryBlue, strokeOpacity: 0.8, strokeWeight: 4 }}
          />
        )}
      </GoogleMap>

      {/* ── Long-press Point Picker ── */}
      {longPressPoint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={() => setLongPressPoint(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: rd.lg, padding: `${sp.md}px`, width: '80%', maxWidth: 320, boxShadow: '0 12px 48px rgba(0,0,0,0.25)', zIndex: 601 }}>
            <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: sp.sm, textAlign: 'center' }}>長按地圖選擇地點</div>
            {[
              { label: '設為取貨點', key: 'pickup' },
              { label: '設為目的地', key: 'dropoff' },
              ...(data.extraStops.length < 3 ? [{ label: '設為中途站', key: 'stop' }] : []),
            ].map(opt => (
              <div key={opt.key} onClick={async () => {
                const { lat, lng } = longPressPoint;
                const addr = await reverseGeocode(lat, lng);
                if (opt.key === 'pickup') { setData(p => ({ ...p, pickup: addr, pickupCoord: [lat, lng] })); panToCoord([lat, lng]); }
                else if (opt.key === 'dropoff') {
                  const pc = data.pickupCoord;
                  if (pc) {
                    const crossBorder = isHK(pc[0], pc[1]) !== isHK(lat, lng);
                    setData(p => ({ ...p, dropoff: addr, dropoffCoord: [lat, lng], isCrossBorder: crossBorder, service: crossBorder ? 'business' : p.service }));
                  } else { setData(p => ({ ...p, dropoff: addr, dropoffCoord: [lat, lng] })); }
                  panToCoord([lat, lng]);
                } else { setData(p => ({ ...p, extraStops: [...p.extraStops, addr], extraStopsCoord: [...p.extraStopsCoord, [lat, lng]] })); panToCoord([lat, lng]); }
                setLongPressPoint(null);
              }} style={{ display: 'flex', alignItems: 'center', gap: sp.sm, padding: `${sp.sm}px ${sp.md}px`, borderRadius: rd.md, cursor: 'pointer', marginBottom: 4, background: colors.lightGrey, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(195,234,79,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = colors.lightGrey)}>
                <IconMapPin size={18} color={colors.primaryBlue} />
                <span style={{ fontSize: 15, fontWeight: 600, color: colors.darkGrey }}>{opt.label}</span>
              </div>
            ))}
            <div onClick={() => setLongPressPoint(null)} style={{ marginTop: sp.sm, textAlign: 'center', fontSize: 13, color: colors.textMuted, cursor: 'pointer', padding: `${sp.xs}px` }}>取消</div>
          </div>
        </div>
      )}

      {/* ── Step Indicator ── */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500, display: 'flex', gap: 6, alignItems: 'center' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s === step ? colors.primaryBlue : s < step ? colors.primaryBlue : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease' }} />
        ))}
      </div>

      {/* ── Close Button ── */}
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, zIndex: 500, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: rd.full, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <IconX size={18} color={colors.darkGrey} />
      </button>

      {/* ── Bottom Panel ── */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${panelVh}dvh`,
          background: colors.white,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transition: isDragging ? 'none' : 'height 0.2s ease',
          zIndex: 600,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, cursor: 'grab', flexShrink: 0, borderBottom: `1px solid ${colors.lightGrey}`, background: '#FAFAFA', userSelect: 'none' }}>
          <div style={{ width: 52, height: 7, background: '#CBD5E1', borderRadius: 4, marginRight: 14 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: colors.darkGrey, letterSpacing: 0.3 }}>
            {panelVh < 50 ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} 展開/收起
          </span>
        </div>

        {/* ── STEP 1: Add Pickup + Destination ── */}
        {step === 1 && (
          <div style={{ flex: 1, padding: `${sp.md}px`, overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.darkGrey, marginBottom: sp.md }}>
              <IconPackage size={18} color={colors.primaryBlue} /> 安排送貨
            </div>

            {/* Pickup */}
            <div style={{ marginBottom: sp.md }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>取貨點</div>
              <SearchInput
                value={data.pickup}
                onChange={v => setData(p => ({ ...p, pickup: v }))}
                onSelect={handlePickupSelect}
                placeholder="輸入或長按地圖"
                icon={<IconMapPin size={16} color={colors.primaryBlue} />}
              />
              {data.pickupCoord && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconCheck size={14} color={colors.success} />
                  <span style={{ fontSize: 12, color: colors.success, fontWeight: 600 }}>已設定</span>
                </div>
              )}
            </div>

            {/* Dropoff */}
            <div style={{ marginBottom: sp.md }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>目的地</div>
              <SearchInput
                value={data.dropoff}
                onChange={v => setData(p => ({ ...p, dropoff: v }))}
                onSelect={handleDropoffSelect}
                placeholder="輸入或長按地圖"
                icon={<IconMapPin size={16} color={colors.orange} />}
              />
              {data.dropoffCoord && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconCheck size={14} color={colors.success} />
                  <span style={{ fontSize: 12, color: colors.success, fontWeight: 600 }}>已設定</span>
                </div>
              )}
            </div>

            {/* Continue button */}
            <button
              onClick={() => { if (data.pickupCoord && data.dropoffCoord) setStep(2); else toast.error('請先設定取貨點和目的地'); }}
              style={{
                width: '100%', padding: `${sp.md}px`, background: data.pickupCoord && data.dropoffCoord ? colors.primaryBlue : colors.lightGrey,
                color: data.pickupCoord && data.dropoffCoord ? '#fff' : colors.textMuted,
                border: 'none', borderRadius: rd.full, fontSize: 16, fontWeight: 800, cursor: data.pickupCoord && data.dropoffCoord ? 'pointer' : 'not-allowed',
                boxShadow: data.pickupCoord && data.dropoffCoord ? '0 4px 14px rgba(195,234,79,0.35)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              繼續 <IconArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Service + Vehicle ── */}
        {step === 2 && (
          <div style={{ flex: 1, padding: `${sp.md}px`, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sp.md }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <IconChevronUp size={20} color={colors.darkGrey} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <span style={{ fontSize: 14, color: colors.textMuted }}>返回上一步</span>
            </div>

            {/* Service tabs */}
            <div style={{ display: 'flex', gap: sp.xs, marginBottom: sp.md }}>
              {SERVICE_TABS.map(tab => (
                <div key={tab.key} onClick={() => {
                  const defaultVehicle: Record<string, VehicleType> = { delivery: 'motorcycle', move: 'light', business: 'van_7' };
                  setData(p => ({ ...p, service: tab.key, vehicleType: defaultVehicle[tab.key] }));
                }} style={{ flex: 1, padding: `${sp.sm}px 4px`, background: data.service === tab.key ? colors.primaryBlue : colors.lightGrey, borderRadius: rd.full, textAlign: 'center', cursor: 'pointer', boxShadow: data.service === tab.key ? '0 4px 14px rgba(195,234,79,0.35)' : 'none', transition: 'all 0.2s ease' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: data.service === tab.key ? '#fff' : colors.darkGrey, marginTop: 2 }}>{tab.label}</div>
                </div>
              ))}
            </div>

            {/* Vehicle options */}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>車型</div>
            <div style={{ display: 'flex', gap: sp.xs, marginBottom: sp.md }}>
              {vehicleOptions.map(v => (
                <div key={v.type} onClick={() => setData(p => ({ ...p, vehicleType: v.type }))} style={{ flex: 1, background: data.vehicleType === v.type ? '#E8F4FF' : colors.white, border: `2px solid ${data.vehicleType === v.type ? colors.primaryBlue : colors.lightGrey}`, borderRadius: rd.full, padding: `${sp.sm}px 4px`, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: data.vehicleType === v.type ? '0 4px 14px rgba(195,234,79,0.25)' : 'none', transition: 'all 0.2s ease' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: data.vehicleType === v.type ? colors.primaryBlue : colors.darkGrey }}>{v.label}</span>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>{v.sub}</span>
                </div>
              ))}
            </div>

            {/* Continue */}
            <button onClick={() => setStep(3)} style={{ width: '100%', padding: `${sp.md}px`, background: colors.primaryBlue, color: '#fff', border: 'none', borderRadius: rd.full, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(195,234,79,0.35)' }}>
              繼續 <IconArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 3: Time + Load ── */}
        {step === 3 && (
          <div style={{ flex: 1, padding: `${sp.md}px`, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sp.md }}>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <IconChevronUp size={20} color={colors.darkGrey} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <span style={{ fontSize: 14, color: colors.textMuted }}>返回上一步</span>
            </div>

            {/* Time */}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>時間</div>
            <div style={{ display: 'flex', gap: sp.xs, marginBottom: sp.md }}>
              {TIME_OPTIONS.map(opt => (
                <div key={opt.key} onClick={() => { setData(p => ({ ...p, time: opt.key })); if (opt.key === 'scheduled') setShowDatePicker(true); else setShowDatePicker(false); }} style={{ flex: 1, background: data.time === opt.key ? colors.primaryBlue : colors.lightGrey, borderRadius: rd.full, padding: `${sp.sm}px 4px`, textAlign: 'center', cursor: 'pointer', boxShadow: data.time === opt.key ? '0 4px 14px rgba(195,234,79,0.35)' : 'none', transition: 'all 0.2s ease' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: data.time === opt.key ? '#fff' : colors.darkGrey }}>{opt.label}</span>
                  {opt.surcharge && <div style={{ fontSize: 10, color: data.time === opt.key ? '#fff8' : colors.textMuted }}>{opt.surcharge}</div>}
                </div>
              ))}
            </div>

            {showDatePicker && (
              <input type="datetime-local" value={scheduledDate} onChange={e => { setScheduledDate(e.target.value); setData(p => ({ ...p, scheduledTime: new Date(e.target.value) })); }} style={{ width: '100%', padding: '10px 14px', border: `2px solid ${colors.primaryBlue}`, borderRadius: rd.md, fontSize: 15, marginBottom: sp.md, boxSizing: 'border-box' }} />
            )}

            {/* Load size */}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>货物大小</div>
            <div style={{ display: 'flex', gap: sp.xs, marginBottom: sp.md }}>
              {LOAD_OPTIONS.map(opt => (
                <div key={opt.type} onClick={() => setData(p => ({ ...p, loadType: opt.type }))} style={{ flex: 1, background: data.loadType === opt.type ? '#E8F4FF' : colors.white, border: `2px solid ${data.loadType === opt.type ? colors.primaryBlue : colors.lightGrey}`, borderRadius: rd.full, padding: `${sp.sm}px 4px`, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: data.loadType === opt.type ? '0 4px 14px rgba(195,234,79,0.25)' : 'none', transition: 'all 0.2s ease' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{opt.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: data.loadType === opt.type ? colors.primaryBlue : colors.darkGrey }}>{opt.label}</span>
                </div>
              ))}
            </div>

            {/* Fare card */}
            {fare && (
              <div style={{ background: 'rgba(195,234,79,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: rd.lg, padding: sp.md, border: '1.5px solid rgba(195,234,79,0.30)', marginBottom: sp.md, boxShadow: colors.shadowSm }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{fare.distanceKm}km · 約{fare.estimatedMinutes}分鐘</div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>估計總費</div>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: colors.primaryBlue, lineHeight: 1.1 }}>{formatFare(fare.total)}</div>
                </div>
              </div>
            )}

            <button onClick={() => setStep(4)} style={{ width: '100%', padding: `${sp.md}px`, background: colors.primaryBlue, color: '#fff', border: 'none', borderRadius: rd.full, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(195,234,79,0.35)' }}>
              確認發佈 <IconCheck size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 4: Confirm ── */}
        {step === 4 && (
          <div style={{ flex: 1, padding: `${sp.md}px`, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sp.md }}>
              <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <IconChevronUp size={20} color={colors.darkGrey} style={{ transform: 'rotate(-90deg)' }} />
              </button>
              <span style={{ fontSize: 14, color: colors.textMuted }}>返回上一步</span>
            </div>

            {/* Summary */}
            <div style={{ background: colors.lightGrey, borderRadius: rd.lg, padding: sp.md, marginBottom: sp.md }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <IconMapPin size={14} color={colors.primaryBlue} />
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.darkGrey }}>{data.pickup || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconMapPin size={14} color={colors.orange} />
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.darkGrey }}>{data.dropoff || '—'}</span>
              </div>
            </div>

            {/* Fare */}
            {fare && (
              <div style={{ background: 'rgba(195,234,79,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: rd.lg, padding: sp.md, border: '1.5px solid rgba(195,234,79,0.30)', marginBottom: sp.md, boxShadow: colors.shadowSm }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{fare.distanceKm}km · 約{fare.estimatedMinutes}分鐘</div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>估計總費</div>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: colors.primaryBlue, lineHeight: 1.1 }}>{formatFare(fare.total)}</div>
                </div>
              </div>
            )}

            <button onClick={handlePublish} disabled={!canPublish} style={{ width: '100%', padding: `${sp.md}px`, background: canPublish ? colors.primaryBlue : colors.lightGrey, color: canPublish ? '#fff' : colors.textMuted, border: 'none', borderRadius: rd.full, fontSize: 16, fontWeight: 800, cursor: canPublish ? 'pointer' : 'not-allowed', boxShadow: canPublish ? '0 4px 14px rgba(195,234,79,0.40)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>確認發佈 <IconCheck size={16} /></span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
