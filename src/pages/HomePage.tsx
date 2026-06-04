import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import AddressSearchInput from '../components/AddressSearchInput';
import { useAuth } from '../context/AuthContext';
import { useSideMenu } from '../context/SideMenuContext';
import { subscribeToPendingBookings, createBooking } from '../services/bookings';
import { calculateFare, formatFare, generateRouteWaypoints } from '../utils/pricing';
import type { Booking, VehicleType } from '../types';
import { colors, sp, rd } from '../styles';

const HK_CENTER = { lat: 22.3193, lng: 114.1694 };
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

type PanelFlow = 'step1' | 'step2' | 'closed';
type ServiceTab = 'delivery' | 'move';

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lon: number;
}

// ─── Places API (Nominatim + Google Places) ───────────────────────────────
export async function getPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Hong Kong')}&limit=5&addressdetails=1`
    );
    const data = await res.json();
    return data.map((item: Record<string, unknown>) => ({
      placeId: item.place_id as string,
      description: item.display_name as string,
      mainText: (item.address as Record<string, string>)?.road || item.display_name as string,
      secondaryText: ((item.address as Record<string, string>)?.city || '') + ((item.address as Record<string, string>)?.district ? ', ' + (item.address as Record<string, string>)?.district : ''),
      lat: parseFloat(item.lat as string),
      lon: parseFloat(item.lon as string),
    }));
  } catch { return []; }
}

export async function getPlaceCoords(placeId: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&place_id=${encodeURIComponent(placeId)}&limit=1`
    );
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { /* ignore */ }
  return null;
}

// ─── Geocode helpers ────────────────────────────────────────────────────────
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const suggestions = await getPlaceSuggestions(address);
  if (suggestions.length > 0) return [suggestions[0].lat, suggestions[0].lon];
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&limit=1`
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

interface SheetData {
  pickup: string;
  pickupCoord: [number, number] | null;
  dropoff: string;
  dropoffCoord: [number, number] | null;
  extraStops: string[];
  extraStopsCoord: [number, number][];
  service: ServiceTab;
  time: string;
  scheduledTime?: Date;
  vehicleType: VehicleType;
  loadType?: 'small' | 'medium' | 'large';
  loadWeight?: string;
  hasInsurance?: boolean;
  hasAssistant?: boolean;
  notes?: string;
}

const DEFAULT_DATA: SheetData = {
  pickup: '', pickupCoord: null,
  dropoff: '', dropoffCoord: null,
  extraStops: [], extraStopsCoord: [],
  service: 'delivery',
  time: 'now',
  vehicleType: 'light',
  loadType: 'small',
};

const SERVICE_TABS: { key: ServiceTab; label: string; emoji: string }[] = [
  { key: 'move', label: '叫車', emoji: '🚗' },
  { key: 'delivery', label: '速遞', emoji: '📦' },
];

// ─── Map component ─────────────────────────────────────────────────────────
interface GoogleMapWrapperProps {
  center: { lat: number; lng: number };
  zoom: number;
  pickupCoord: [number, number] | null;
  dropoffCoord: [number, number] | null;
  routeCoords: [number, number][];
  bookings: Booking[];
  clickMode: boolean;
  extraStopMarkers?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
}

function GoogleMapWrapper({
  center, zoom, pickupCoord, dropoffCoord, routeCoords, bookings,
  clickMode, extraStopMarkers = [], onMapClick, onMarkerClick
}: GoogleMapWrapperProps) {
  const mapRef = useCallback((node: google.maps.Map | null) => {
    if (!node) return;
    if (pickupCoord) node.panTo({ lat: pickupCoord[0], lng: pickupCoord[1] });
    else if (dropoffCoord) node.panTo({ lat: dropoffCoord[0], lng: dropoffCoord[1] });
  }, [pickupCoord, dropoffCoord]);

  return (
    <GoogleMap
      id="main-map"
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={zoom}
      onLoad={mapRef}
      options={{ styles: MAP_STYLE, disableDefaultUI: true, zoomControl: true }}
      onClick={e => clickMode && onMapClick?.((e as google.maps.MapMouseEvent).latLng!.lat(), (e as google.maps.MapMouseEvent).latLng!.lng())}
    >
      {pickupCoord && <Marker position={{ lat: pickupCoord[0], lng: pickupCoord[1] }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: colors.primaryBlue, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }} />}
      {dropoffCoord && <Marker position={{ lat: dropoffCoord[0], lng: dropoffCoord[1] }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: colors.orange, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }} />}
      {extraStopMarkers.map((c, i) => <Marker key={i} position={{ lat: c[0], lng: c[1] }} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#FFD600', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }} />)}
      {routeCoords.length > 1 && <Polyline path={routeCoords.map(c => ({ lat: c[0], lng: c[1] }))} options={{ strokeColor: colors.primaryBlue, strokeOpacity: 0.8, strokeWeight: 4 }} />}
      {bookings.map(b => <Marker key={b.id} position={{ lat: b.pickupLat ?? 0, lng: b.pickupLng ?? 0 }} onClick={() => onMarkerClick?.(b.id)} />)}
    </GoogleMap>
  );
}

// ─── Step Indicator ────────────────────────────────────────────────────────
function StepIndicator({ currentStep, onGoToStep }: { currentStep: 1 | 2; onGoToStep?: (step: 1 | 2) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: sp.xs, padding: `${sp.sm}px ${sp.md}px`, background: colors.white, borderBottom: `1px solid ${colors.lightGrey}` }}>
      {['填寫地址', '確認用車'].map((label, i) => {
        const step = i + 1 as 1 | 2;
        const active = step === currentStep;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => step < currentStep && onGoToStep?.(step)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: step < currentStep ? 'pointer' : 'default', padding: '4px 6px', borderRadius: 12 }}
            >
              <div style={{ width: 24, height: 24, borderRadius: 12, background: active ? colors.primaryBlue : step < currentStep ? '#B8D4F0' : colors.lightGrey, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: active ? '#fff' : step < currentStep ? colors.primaryBlue : colors.textMuted }}>{step}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? colors.primaryBlue : step < currentStep ? colors.primaryBlue : colors.textMuted }}>{label}</span>
            </button>
            {step < 2 && <span style={{ color: colors.lightGrey, fontSize: 14, margin: '0 2px' }}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 Form — Route Input ─────────────────────────────────────────────
interface Step1FormProps {
  data: SheetData;
  setData: React.Dispatch<React.SetStateAction<SheetData>>;
  onPreview: () => void;
  onBackToService: () => void;
}

function Step1Form({ data, setData, onPreview, onBackToService }: Step1FormProps) {
  const [pickupInput, setPickupInput] = useState(data.pickup || '');
  const [dropoffInput, setDropoffInput] = useState(data.dropoff || '');
  const [newStop, setNewStop] = useState('');
  const [showStopInput, setShowStopInput] = useState(false);

  const canPreview = data.pickupCoord && data.dropoffCoord;

  // Sync input values when data changes (e.g., back from step2)
  useEffect(() => {
    setPickupInput(data.pickup || '');
    setDropoffInput(data.dropoff || '');
  }, [data.pickup, data.dropoff]);

  const addStop = () => {
    if (newStop.trim()) {
      setData(prev => ({
        ...prev,
        extraStops: [...prev.extraStops, newStop.trim()],
        extraStopsCoord: [...prev.extraStopsCoord, [0, 0]],
      }));
      setNewStop('');
      setShowStopInput(false);
    }
  };

  return (
    <div style={{ padding: `0 ${sp.md}px ${sp.md}px`, display: 'flex', flexDirection: 'column', gap: sp.sm }}>
      {/* Pickup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, minHeight: 48 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, border: `2px solid ${colors.primaryBlue}`, background: '#fff', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <AddressSearchInput
            value={pickupInput}
            onChange={v => { setPickupInput(v); if (!v) setData(p => ({ ...p, pickup: v, pickupCoord: null })); }}
            onSelect={(addr, coord) => { setPickupInput(addr); setData(p => ({ ...p, pickup: addr, pickupCoord: coord })); }}
            placeholder="起始點（取貨）"
          />
        </div>
        {data.pickupCoord && <span style={{ fontSize: 14 }}>📍</span>}
      </div>

      {/* Dropoff */}
      <div style={{ display: 'flex', alignItems: 'center', gap: sp.sm, minHeight: 48 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, border: `2px solid ${colors.orange}`, background: '#fff', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <AddressSearchInput
            value={dropoffInput}
            onChange={v => { setDropoffInput(v); if (!v) setData(p => ({ ...p, dropoff: v, dropoffCoord: null })); }}
            onSelect={(addr, coord) => { setDropoffInput(addr); setData(p => ({ ...p, dropoff: addr, dropoffCoord: coord })); }}
            placeholder="目的地（送貨）"
          />
        </div>
        {data.dropoffCoord && <span style={{ fontSize: 14 }}>📍</span>}
      </div>

      {/* Extra stops */}
      {data.extraStops.map((stop, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: sp.sm }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: '#FFD600' }} />
          <span style={{ flex: 1, fontSize: 14, color: colors.darkGrey }}>{stop}</span>
          <button style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: colors.textMuted }} onClick={() => setData(p => ({ ...p, extraStops: p.extraStops.filter((_, idx) => idx !== i), extraStopsCoord: p.extraStopsCoord.filter((_, idx) => idx !== i) }))}>✕</button>
        </div>
      ))}

      {/* Add stop */}
      <button style={{ background: 'none', border: `1.5px dashed ${colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.xs}px`, fontSize: 13, fontWeight: 600, color: colors.textMuted, cursor: 'pointer' }} onClick={() => setShowStopInput(true)}>
        + 新增中途站
      </button>
      {showStopInput && (
        <div style={{ display: 'flex', gap: sp.xs }}>
          <input style={{ flex: 1, border: `1.5px solid ${colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.sm}px ${sp.md}px`, fontSize: 15, fontFamily: 'Inter, system-ui, sans-serif', color: colors.darkGrey, outline: 'none', boxSizing: 'border-box' as const }} placeholder="輸入中途站" value={newStop} onChange={e => setNewStop(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addStop(); }} autoFocus />
          <button style={{ background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: rd.md, padding: `${sp.sm}px ${sp.md}px`, fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={addStop}>新增</button>
        </div>
      )}

      {/* Back to service selection */}
      <button style={{ background: 'none', border: 'none', fontSize: 12, color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }} onClick={onBackToService}>
        ← 選擇服務
      </button>

      {/* Back and Preview route buttons */}
      <div style={{ display: 'flex', gap: sp.sm, paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <button style={{ flex: '0 0 auto', background: colors.white, color: colors.primaryBlue, border: `2px solid ${colors.primaryBlue}`, borderRadius: rd.lg, padding: `${sp.md}px ${sp.lg}px`, fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={onBackToService}>← 返回</button>
        <button
          style={{ flex: 1, background: canPreview ? colors.primaryBlue : colors.lightGrey, color: colors.darkGrey, border: 'none', borderRadius: rd.lg, padding: `${sp.md}px`, fontSize: 16, fontWeight: 700, cursor: canPreview ? 'pointer' : 'not-allowed' }}
          disabled={!canPreview}
          onClick={onPreview}
        >
          預覽路線 →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 Form — Options & Publish ──────────────────────────────────────
interface Step2FormProps {
  data: SheetData;
  setData: React.Dispatch<React.SetStateAction<SheetData>>;
  fare: { total: number; distanceKm: number; estimatedMinutes: number; baseFare: number; distanceFare: number; speedSurcharge: number } | null;
  onBackToStep1: () => void;
  onBackToService: () => void;
  onPublish: () => void;
}

function Step2Form({ data, setData, fare, onBackToStep1, onBackToService, onPublish }: Step2FormProps) {
  const [notes, setNotes] = useState(data.notes ?? '');
  const [showDateTimePicker, setShowDateTimePicker] = useState(!!data.scheduledTime);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const VEHICLE_OPTIONS: { type: VehicleType; icon: string; label: string; load: string }[] = [
    { type: 'motorcycle', icon: '🛵', label: '電單車', load: '~50kg' },
    { type: 'light', icon: '🚚', label: '輕型貨車', load: '~1000kg' },
    { type: 'truck_5_5t', icon: '🚛', label: '5.5噸貨車', load: '~2000kg' },
  ];

  const SERVICE_SPEED = [
    { key: 'now', label: '即時', surcharge: '+30%' },
    { key: '4hour', label: '4小時', surcharge: '' },
    { key: 'sameday', label: '即日', surcharge: '9折' },
  ];

  const handleScheduleChange = (val: string) => {
    setScheduledDate(val);
    setData(p => ({ ...p, scheduledTime: new Date(val) }));
  };

  const setTimeAndMode = (key: string) => {
    setData(p => ({ ...p, time: key }));
    if (key === 'scheduled') setShowDateTimePicker(true);
    else setShowDateTimePicker(false);
  };

  // Sync showDateTimePicker when data.time changes from parent (e.g., back navigation)
  useEffect(() => {
    if (data.time === 'scheduled' && data.scheduledTime) {
      setShowDateTimePicker(true);
      // Update scheduledDate to match data.scheduledTime
      setScheduledDate(new Date(data.scheduledTime).toISOString().slice(0, 16));
    } else if (data.time === 'now') {
      setShowDateTimePicker(false);
    }
  }, [data.time, data.scheduledTime]);

  return (
    <div style={{ padding: `0 ${sp.md}px ${sp.md}px`, display: 'flex', flexDirection: 'column', gap: sp.sm }}>
      {/* Route summary */}
      <div style={{ background: colors.lightGrey, borderRadius: rd.md, padding: `${sp.sm}px ${sp.md}px`, fontSize: 12, color: colors.textMuted }}>
        {data.pickup || '起始點'} → {data.dropoff || '目的地'}
        {data.extraStops.length > 0 && <span> (+{data.extraStops.length}個中途站)</span>}
      </div>

      {/* Vehicle type */}
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>車型</div>
      <div style={{ display: 'flex', gap: sp.xs }}>
        {VEHICLE_OPTIONS.map(v => (
          <div key={v.type} style={{ flex: 1, background: data.vehicleType === v.type ? '#E8F4FF' : colors.white, border: `2px solid ${data.vehicleType === v.type ? colors.primaryBlue : colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.sm}px 4px`, textAlign: 'center' as const, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, gap: 2 }} onClick={() => setData(p => ({ ...p, vehicleType: v.type }))}>
            <span style={{ fontSize: 24 }}>{v.icon}</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: data.vehicleType === v.type ? colors.primaryBlue : colors.darkGrey }}>{v.label}</div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>{v.load}</div>
          </div>
        ))}
      </div>

      {/* Time mode */}
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.sm }}>服務時間</div>
      <div style={{ display: 'flex', gap: sp.xs }}>
        {SERVICE_SPEED.map(opt => {
          const isActive = data.time === opt.key;
          return (
            <div key={opt.key} style={{ flex: 1, background: isActive ? colors.primaryBlue : colors.lightGrey, borderRadius: rd.md, padding: `${sp.sm}px 4px`, textAlign: 'center', cursor: 'pointer' }} onClick={() => setTimeAndMode(opt.key)}>
              <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? '#fff' : colors.darkGrey }}>{opt.label}</span>
              {opt.surcharge && <div style={{ fontSize: 10, color: isActive ? '#fff8' : colors.textMuted }}>{opt.surcharge}</div>}
            </div>
          );
        })}
      </div>

      {/* Datetime picker */}
      {showDateTimePicker && (
        <div style={{ background: '#E8F4FF', border: `1.5px solid ${colors.primaryBlue}44`, borderRadius: rd.lg, padding: sp.md }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.primaryBlue, marginBottom: sp.xs }}>📅 選擇預約時間</div>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={e => handleScheduleChange(e.target.value)}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${colors.lightGrey}`, borderRadius: rd.md, fontSize: 15, fontFamily: 'Inter, system-ui, sans-serif', color: colors.darkGrey, outline: 'none', boxSizing: 'border-box' as const }}
          />
          <div style={{ display: 'flex', gap: sp.xs, marginTop: sp.xs }}>
            {([['2小時後', 2], ['4小時後', 4], ['明天上午', -1]] as [string, number][]).map(([label, hrs]) => (
              <button key={label} style={{ flex: 1, padding: '7px 4px', background: colors.white, border: `1px solid ${colors.primaryBlue}44`, borderRadius: rd.md, fontSize: 11, fontWeight: 700, color: colors.primaryBlue, cursor: 'pointer' }} onClick={() => { const d = new Date(); if (hrs === -1) { d.setHours(9, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); } else { d.setHours(d.getHours() + hrs, 0, 0, 0); } handleScheduleChange(d.toISOString().slice(0, 16)); }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delivery options */}
      {data.service === 'delivery' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.sm }}>货物大小</div>
          <div style={{ display: 'flex', gap: sp.xs }}>
            {([{ k: 'small', l: '📦小件' }, { k: 'medium', l: '🧳中件' }, { k: 'large', l: '🚢大件' }] as const).map(s => (
              <div key={s.k} style={{ flex: 1, background: data.loadType === s.k ? '#E8F4FF' : colors.white, border: `2px solid ${data.loadType === s.k ? colors.primaryBlue : colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.sm}px`, textAlign: 'center' as const, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' as const, justifyContent: 'center' as const }} onClick={() => setData(p => ({ ...p, loadType: s.k }))}>
                {s.l}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes */}
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: sp.sm }}>備注</div>
      <textarea
        style={{ width: '100%', minHeight: 72, border: `1.5px solid ${colors.lightGrey}`, borderRadius: rd.md, padding: `${sp.sm}px`, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: colors.darkGrey, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, display: 'block' }}
        placeholder="可填寫樓層、特殊货物等..."
        value={notes}
        maxLength={200}
        onChange={e => { setNotes(e.target.value); setData(p => ({ ...p, notes: e.target.value })); }}
      />
      <div style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right' }}>{notes.length}/200</div>

      {/* Fare card */}
      {fare ? (
        <div style={{ background: '#F0F7FF', borderRadius: rd.lg, padding: sp.md, border: `1.5px solid ${colors.primaryBlue}22`, display: 'flex', flexDirection: 'column' as const, gap: sp.sm }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' as const }}>
            <span style={{ fontSize: 12, color: colors.textMuted }}>{fare.distanceKm}km · 約{fare.estimatedMinutes}分鐘</span>
            <div style={{ textAlign: 'right' as const }}>
              <span style={{ fontSize: 11, color: colors.textMuted }}>估計總費</span>
              <div style={{ fontSize: 28, fontWeight: 900, color: colors.primaryBlue, lineHeight: 1.1 }}>{formatFare(fare.total)}</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${colors.lightGrey}`, paddingTop: sp.sm, marginTop: sp.sm, display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: colors.textSecondary }}>起步價</span><span style={{ fontWeight: 600 }}>{formatFare(fare.baseFare)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: colors.textSecondary }}>里程費</span><span style={{ fontWeight: 600 }}>{formatFare(fare.distanceFare)}</span></div>
            {fare.speedSurcharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: colors.textSecondary }}>速度附加</span><span style={{ color: colors.orange, fontWeight: 600 }}>+{formatFare(fare.speedSurcharge)}</span></div>}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, padding: sp.md }}>
          選擇車型以計算車費
        </div>
      )}

      {/* Back to service selection */}
      <button style={{ background: 'none', border: 'none', fontSize: 12, color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }} onClick={onBackToService}>
        ← 選擇服務
      </button>

      {/* Actions */}
      <div style={{ display: 'flex', gap: sp.sm, paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <button style={{ flex: '0 0 auto', background: colors.white, color: colors.primaryBlue, border: `2px solid ${colors.primaryBlue}`, borderRadius: rd.lg, padding: `${sp.md}px ${sp.lg}px`, fontSize: 15, fontWeight: 700, cursor: 'pointer' }} onClick={onBackToStep1}>← 返回</button>
        <button style={{ flex: 1, background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: rd.lg, padding: `${sp.md}px`, fontSize: 16, fontWeight: 700, cursor: 'pointer' }} onClick={onPublish}>確認發佈 ✓</button>
      </div>
    </div>
  );
}

// ─── Main HomePage ─────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openMenu } = useSideMenu();
  const [data, setData] = useState<SheetData>(DEFAULT_DATA);
  const [panelFlow, setPanelFlow] = useState<PanelFlow>('closed');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const fare = useMemo(() => {
    if (!data.pickupCoord || !data.dropoffCoord) return null;
    return calculateFare({
      pickupCoord: data.pickupCoord,
      dropoffCoord: data.dropoffCoord,
      vehicleType: data.vehicleType,
      speed: data.time === 'now' ? 'immediate' : data.time === '4hour' ? '4hour' : data.time === 'sameday' ? 'sameday' : 'scheduled',
      scheduledTime: data.scheduledTime,
      extraStops: data.extraStops.length,
      loadSize: data.loadType ?? 'small',
      loadWeight: (data.loadWeight === '10-50kg' ? 'medium' : data.loadWeight === '50kg+' ? 'heavy' : 'light') as 'light' | 'medium' | 'heavy',
      hasInsurance: data.hasInsurance ?? false,
      hasAssistant: data.hasAssistant ?? false,
    });
  }, [data.pickupCoord, data.dropoffCoord, data.vehicleType, data.time, data.scheduledTime, data.extraStops.length, data.loadType, data.loadWeight]);

  const routeCoords = useMemo(() => {
    if (!data.pickupCoord || !data.dropoffCoord) return [];
    return generateRouteWaypoints(data.pickupCoord, data.dropoffCoord);
  }, [data.pickupCoord, data.dropoffCoord, data.extraStopsCoord]);

  useEffect(() => {
    if (!user) return;
    const sub = subscribeToPendingBookings((b: Booking[]) => setBookings(b));
    return () => sub();
  }, [user]);

  const handlePreviewRoute = () => {
    if (data.pickupCoord && data.dropoffCoord) {
      // Preserve time if switching to step2
      setPanelFlow('step2');
    }
  };

  const handleStep2Back = () => setPanelFlow('step1');

  const handlePublish = async () => {
    if (!user?.uid) return;
    try {
      await createBooking({
        renterId: user.uid,
        pickupAddress: data.pickup,
        pickupLat: data.pickupCoord?.[0] ?? 0,
        pickupLng: data.pickupCoord?.[1] ?? 0,
        dropoffAddress: data.dropoff,
        dropoffLat: data.dropoffCoord?.[0] ?? 0,
        dropoffLng: data.dropoffCoord?.[1] ?? 0,
        waypoints: data.extraStops.map((addr, i) => ({ address: addr, lat: data.extraStopsCoord[i]?.[0] ?? 0, lng: data.extraStopsCoord[i]?.[1] ?? 0 })),
        vehicleTypeRequired: data.vehicleType,
        pickupTime: data.time === 'now' ? new Date().toISOString() : (data.scheduledTime?.toISOString() ?? new Date().toISOString()),
        loads: [{ type: data.loadType ?? 'small', count: 1 }],
        totalLoadCount: 1,
        loadDescription: '',
        notes: data.notes ?? '',
      });
      setPublishSuccess(true);
      setData(DEFAULT_DATA);
      setPanelFlow('closed');
      setTimeout(() => setPublishSuccess(false), 3000);
    } catch (e) { console.error(e); }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (panelFlow === 'step1') {
      const addr = await reverseGeocode(lat, lng);
      if (!data.pickupCoord) setData(p => ({ ...p, pickupCoord: [lat, lng], pickup: addr }));
      else if (!data.dropoffCoord) setData(p => ({ ...p, dropoffCoord: [lat, lng], dropoff: addr }));
      else setData(p => ({ ...p, extraStops: [...p.extraStops, addr], extraStopsCoord: [...p.extraStopsCoord, [lat, lng]] }));
    }
  };

  const hs = {
    page: { position: 'relative' as const, width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column' as const, fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' as const },
    topBar: { position: 'absolute' as const, top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${sp.sm}px ${sp.md}px`, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' },
    menuBtn: { background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
    logo: { fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' },
    mapWrap: { flex: 1, position: 'relative' as const },
    panelWrap: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, background: colors.white, borderRadius: '28px 28px 0 0', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const, zIndex: 260 },
    panelContent: { overflowY: 'auto' as const, flex: 1, minHeight: 0, overscrollBehavior: 'contain' as const },
    serviceTabRow: { display: 'flex', background: colors.lightGrey, borderRadius: rd.lg, padding: 4, gap: 4 },
    serviceTab: { flex: 1, padding: `${sp.sm}px`, textAlign: 'center' as const, fontSize: 13, fontWeight: 600, color: colors.darkGrey, borderRadius: rd.md, cursor: 'pointer' },
    serviceTabActive: { flex: 1, padding: `${sp.sm}px`, textAlign: 'center' as const, fontSize: 13, fontWeight: 700, color: colors.darkGrey, background: colors.primaryBlue, borderRadius: rd.md, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
    serviceTabDisabled: { flex: 1, padding: `${sp.sm}px`, textAlign: 'center' as const, fontSize: 13, fontWeight: 500, color: colors.lightGrey, cursor: 'not-allowed' as const },
    comingSoon: { fontSize: 9, background: colors.lightGrey, borderRadius: 3, padding: '1px 4px', marginLeft: 4 },
    successToast: { position: 'absolute' as const, top: 80, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', padding: `${sp.sm}px ${sp.lg}px`, borderRadius: '9999px', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 200 },
  };

  // ─── Drawer height control (draggable) ───────────────────────────────────
  const MIN_PANEL = 50;  // 50dvh collapsed
  const MAX_PANEL = 85;  // 85dvh expanded
  const [panelVh, setPanelVh] = useState(MIN_PANEL);
  const dragRef = useRef<{ startY: number; startVh: number } | null>(null);

  // touch/mouse drag to resize
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startVh: panelVh };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = dragRef.current.startY - e.clientY;
    const dvh = (dy / window.innerHeight) * 100;
    setPanelVh(Math.max(MIN_PANEL, Math.min(MAX_PANEL, dragRef.current.startVh + dvh)));
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <div style={hs.page}>
      {/* Top bar */}
      <div style={hs.topBar}>
        <button style={hs.menuBtn} onClick={openMenu}>☰</button>
        <span style={hs.logo}>OpenVans</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Map */}
      <div style={hs.mapWrap}>
        <GoogleMapWrapper
          center={HK_CENTER}
          zoom={12}
          pickupCoord={data.pickupCoord}
          dropoffCoord={data.dropoffCoord}
          routeCoords={routeCoords}
          bookings={bookings}
          clickMode={panelFlow !== 'closed'}
          extraStopMarkers={data.extraStopsCoord}
          onMapClick={handleMapClick}
          onMarkerClick={(id: string) => navigate(`/trips/${id}`)}
        />
        {publishSuccess && <div style={hs.successToast}>✅ 訂單已發佈！</div>}
      </div>

      {/* Bottom panel — step flow */}
      <div
        style={{
          ...hs.panelWrap,
          display: panelFlow !== 'closed' ? 'flex' : 'none',
          flexDirection: 'column',
          height: `${panelVh}dvh`,
          transition: dragRef.current ? 'none' : 'height 0.2s ease',
          maxHeight: `${panelVh}dvh`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Draggable handle */}
        <div
          style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'ns-resize',
            flexShrink: 0,
          }}
          onPointerDown={onPointerDown}
        >
          <div style={{ width: 40, height: 4, background: colors.lightGrey, borderRadius: 2 }} />
        </div>
        <StepIndicator currentStep={panelFlow === 'step1' ? 1 : 2} />
        <div style={{ ...hs.panelContent, overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain' }}>
          {panelFlow === 'step1' && <Step1Form data={data} setData={setData} onPreview={handlePreviewRoute} onBackToService={() => setPanelFlow('closed')} />}
          {panelFlow === 'step2' && <Step2Form data={data} setData={setData} fare={fare} onBackToStep1={handleStep2Back} onBackToService={() => setPanelFlow('closed')} onPublish={handlePublish} />}
        </div>
      </div>

      {/* Service tab panel (when closed) */}
      <div
        style={{
          ...hs.panelWrap,
          display: panelFlow === 'closed' ? 'flex' : 'none',
          flexDirection: 'column',
          height: `${panelVh}dvh`,
          transition: 'height 0.2s ease',
          maxHeight: `${panelVh}dvh`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Draggable handle */}
        <div
          style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'ns-resize',
            flexShrink: 0,
          }}
          onPointerDown={onPointerDown}
        >
          <div style={{ width: 40, height: 4, background: colors.lightGrey, borderRadius: 2 }} />
        </div>
        <div style={{ ...hs.panelContent, overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain' }}>
          <div style={{ padding: `${sp.sm}px ${sp.md}px` }}>
            <div style={hs.serviceTabRow}>
              {SERVICE_TABS.map(tab => (
                <div key={tab.key} style={{ ...(data.service === tab.key ? hs.serviceTabActive : hs.serviceTab), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setData(p => ({ ...p, service: tab.key }))}>
                  <span style={{ fontSize: 16 }}>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: `0 ${sp.md}px ${sp.md}px` }}>
            <div style={{ background: colors.lightGrey, borderRadius: rd.lg, padding: sp.lg, textAlign: 'center', color: colors.darkGrey }}>
              <div style={{ fontSize: 32, marginBottom: sp.sm }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.darkGrey, marginBottom: sp.xs }}>隨時隨地托運</div>
              <div style={{ fontSize: 13 }}>選擇服務然後輸入地址</div>
            </div>
            <button style={{ width: '100%', background: colors.primaryBlue, color: colors.darkGrey, border: 'none', borderRadius: rd.lg, padding: `${sp.md}px`, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: sp.md }} onClick={() => setPanelFlow('step1')}>
              開始用車 🚐
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}