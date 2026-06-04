import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Booking, BookingStatus } from '../types';

// Subscribe to bookings for a renter
export function subscribeToRenterBookings(renterId: string, callback: (bookings: Booking[]) => void) {
  const q = query(
    collection(db, 'bookings'),
    where('renterId', '==', renterId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    callback(bookings);
  });
}

// Subscribe to bookings for a van owner
export function subscribeToOwnerBookings(ownerId: string, callback: (bookings: Booking[]) => void) {
  const q = query(
    collection(db, 'bookings'),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    callback(bookings);
  });
}

// Subscribe to all pending bookings (for matching)
export function subscribeToPendingBookings(callback: (bookings: Booking[]) => void) {
  const q = query(
    collection(db, 'bookings'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    callback(bookings);
  });
}

// Create a new booking
// Strip undefined/null optional geo fields before writing
export async function createBooking(data: Omit<Booking, 'id' | 'createdAt' | 'status' | 'statusHistory'>): Promise<string> {
  // Remove undefined/null geo fields — Firestore doesn't like them
  const { pickupLat, pickupLng, dropoffLat, dropoffLng, waypoints, ...rest } = data;
  const cleanData = {
    ...rest,
    ...(pickupLat != null && { pickupLat }),
    ...(pickupLng != null && { pickupLng }),
    ...(dropoffLat != null && { dropoffLat }),
    ...(dropoffLng != null && { dropoffLng }),
  };
  const ref = await addDoc(collection(db, 'bookings'), {
    ...cleanData,
    status: 'pending',
    statusHistory: [{
      status: 'pending',
      at: new Date().toISOString(),
      by: data.renterId,
    }],
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// Update booking status
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  _actorId: string,
  extra?: Partial<Booking>
): Promise<void> {
  const updates: Partial<Booking> = {
    status: newStatus,
    ...extra,
    statusHistory: [], // TODO: merge with existing
  };
  await updateDoc(doc(db, 'bookings', bookingId), updates as Record<string, unknown>);
}

// Cancel booking
export async function cancelBooking(bookingId: string, _actorId: string): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'cancelled',
  });
}

// Accept booking (owner accepts, assigns their van)
export async function acceptBooking(
  bookingId: string,
  ownerId: string,
  vanId: string
): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'confirmed',
    ownerId,
    vanId,
    confirmedAt: new Date().toISOString(),
  });
}

// Start delivery (confirmed → in_progress)
export async function startBooking(bookingId: string, _actorId: string): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  });
}

// Complete booking
export async function completeBooking(bookingId: string, _actorId: string): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
}

// Get bookings by status
export async function getBooking(bookingId: string): Promise<Booking | null> {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Booking;
  } catch {
    return null;
  }
}

export async function getBookingsByStatus(
  userId: string,
  role: 'owner' | 'renter',
  status: BookingStatus
): Promise<Booking[]> {
  const field = role === 'owner' ? 'ownerId' : 'renterId';
  const q = query(
    collection(db, 'bookings'),
    where(field, '==', userId),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}
