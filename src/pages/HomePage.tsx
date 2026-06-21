import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSideMenu } from '../context/SideMenuContext';
import { subscribeToPendingBookings } from '../services/bookings';
import BookingFlow from '../components/BookingFlow';
import type { Booking } from '../types';
import { colors, sp } from '../styles';

// Redirect driver users to the driver jobs page
function useDriverRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && user.role === 'driver') {
      navigate('/driver-jobs', { replace: true });
    }
  }, [user]);
}

const HK_CENTER = { lat: 22.3193, lng: 114.1694 };
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

// ─── Places API (Nominatim) ───────────────────────────────────────────────
// Hong Kong approximate bounding box (west, north, east, south) for Nominatim.
// Roughly covers the entire HK territory + immediate surrounding waters.
const HK_BOUNDS = { west: 113.83, north: 22.55, east: 114.43, south: 22.13 };
// Pearl River Delta viewbox — used only for cross-border trips so that
// results are restricted to PRD cities (Shenzhen, Dongguan, Zhuhai, Macau,
// Zhongshan, Guangzhou) when serviceType === 'cross_border'.
const PRD_BOUNDS = { west: 112.5, north: 23.5, east: 114.5, south: 21.8 };

export async function getPlaceSuggestions(
  query: string,
  serviceType: 'delivery' | 'truck' | 'cross_border' = 'truck'
) {
  if (!query.trim()) return [];
  try {
    // Restrict search to HK unless the renter explicitly chose cross-border.
    // This prevents accidental searches for Mainland addresses in standard
    // trips (which would be flagged at booking time).
    const isCrossBorder = serviceType === 'cross_border';
    const bounds = isCrossBorder ? PRD_BOUNDS : HK_BOUNDS;
    const countrycodes = isCrossBorder ? 'cn,hk' : 'hk';

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&viewbox=${bounds.west},${bounds.north},${bounds.east},${bounds.south}&bounded=1&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=${countrycodes}`
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

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lon: number;
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

// ─── Main HomePage ─────────────────────────────────────────────────────────
export default function HomePage() {
  useDriverRedirect(); // redirect drivers to driver-jobs immediately
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openMenu } = useSideMenu();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!user) return;
    const sub = subscribeToPendingBookings((b: Booking[]) => setBookings(b));
    return () => sub();
  }, [user]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp.sm}px ${sp.md}px`,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
      }}>
        <button style={{
          background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }} onClick={openMenu}>☰</button>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>OpenVans</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <GoogleMap
          id="home-map"
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={HK_CENTER}
          zoom={12}
          onLoad={node => { mapRef.current = node; }}
          options={{ styles: MAP_STYLE, disableDefaultUI: true, zoomControl: true }}
          onClick={() => {
            // Map clicks are handled by the drawer when open
          }}
        >
          {bookings.map(b => b.pickupLat && b.pickupLng && (
            <Marker key={b.id} position={{ lat: b.pickupLat, lng: b.pickupLng }} onClick={() => navigate(`/trips/${b.id}`)} />
          ))}
        </GoogleMap>
      </div>

      {/* Floating CTA */}
      <button
        onClick={() => setShowBooking(true)}
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          background: colors.primaryBlue,
          color: '#fff',
          border: 'none',
          borderRadius: 28,
          padding: '16px 36px',
          fontSize: 17,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
          zIndex: 270,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        速遞 / 叫車 →
      </button>

      {/* Booking Drawer */}
      {showBooking && (
        <BookingFlow onClose={() => setShowBooking(false)} />
      )}
    </div>
  );
}