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

// ─── Custom Errors ────────────────────────────────────────────────────────────

export const BookingErrorCodes = {
  NOT_FOUND: 'BOOKING_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  VAN_NOT_OWNED: 'VAN_NOT_OWNED',
  BOOKING_NOT_PENDING: 'BOOKING_NOT_PENDING',
  ALREADY_CONFIRMED: 'ALREADY_CONFIRMED',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
} as const;

export type BookingErrorCode = typeof BookingErrorCodes[keyof typeof BookingErrorCodes];

export class BookingError extends Error {
  code: BookingErrorCode;
  statusCode?: number;
  constructor(message: string, code: BookingErrorCode, statusCode?: number) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ─── Helper: build status history entry ──────────────────────────────────────

function buildHistoryEntry(status: BookingStatus, actorId: string) {
  return {
    status,
    at: new Date().toISOString(),
    by: actorId,
  };
}

// ─── Subscribe to bookings for a renter ───────────────────────────────────────

export function subscribeToRenterBookings(
  renterId: string,
  callback: (bookings: Booking[]) => void
) {
  const q = query(
    collection(db, 'bookings'),
    where('renterId', '==', renterId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q,
    (snap) => {
      const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      callback(bookings);
    },
    (err) => {
      // Without this handler, permission-denied / index errors silently fail.
      console.error('[Firestore] subscribeToRenterBookings error:', err);
      callback([]);
    }
  );
}

// ─── Subscribe to bookings for a van owner ────────────────────────────────────

export function subscribeToDriverBookings(
  driverId: string,
  callback: (bookings: Booking[]) => void
) {
  const q = query(
    collection(db, 'bookings'),
    where('driverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q,
    (snap) => {
      const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      callback(bookings);
    },
    (err) => {
      console.error('[Firestore] subscribeToDriverBookings error:', err);
      callback([]);
    }
  );
}

// ─── Subscribe to all pending bookings (for matching) ─────────────────────────

export function subscribeToPendingBookings(callback: (bookings: Booking[]) => void) {
  const q = query(
    collection(db, 'bookings'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q,
    (snap) => {
      const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      callback(bookings);
    },
    (err) => {
      // Critical: if rules deny read for drivers (e.g. driverId undefined for
      // pending bookings) this fires here instead of crashing the app. Without
      // this handler the listener silently dies and the UI shows "0 jobs".
      console.error('[Firestore] subscribeToPendingBookings error:', err);
      callback([]);
    }
  );
}

// ─── Valid status transitions ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Validate that a status transition is allowed.
 * Throws BookingError if transition is invalid.
 */
function validateTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): void {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.includes(newStatus)) {
    throw new BookingError(
      `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      BookingErrorCodes.INVALID_STATUS_TRANSITION
    );
  }
}

// ─── Create a new booking ─────────────────────────────────────────────────────

/**
 * Strip undefined/null optional geo fields before writing.
 * Geo fields that are null/undefined are omitted entirely — Firestore doesn't like them.
 */
export async function createBooking(
  data: Omit<Booking, 'id' | 'createdAt' | 'status' | 'statusHistory'>
): Promise<string> {
  const {
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    waypoints,
    ...rest
  } = data;

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
    statusHistory: [
      buildHistoryEntry('pending', data.renterId),
    ],
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}

// ─── Update booking status (with history merge) ───────────────────────────────

/**
 * Update booking status with proper transition validation and history merge.
 * - Validates that the transition is allowed
 * - Merges new history entry with existing history (does NOT overwrite)
 * - Appends optional extra fields
 *
 * @throws BookingError on invalid transition, not found, or permission denied
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  actorId: string,
  extra?: Partial<Booking>
): Promise<void> {
  const docRef = doc(db, 'bookings', bookingId);

  let snap: ReturnType<typeof getDoc> extends Promise<infer T> ? T : never;
  try {
    snap = await getDoc(docRef);
  } catch (err) {
    throw new BookingError(
      `Failed to fetch booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!snap.exists()) {
    throw new BookingError('Booking not found', BookingErrorCodes.NOT_FOUND, 404);
  }

  const current = snap.data() as Booking;
  const currentStatus = current.status as BookingStatus;

  // Validate transition
  validateTransition(currentStatus, newStatus);

  // Build merged statusHistory — append new entry, keep existing
  const existingHistory = current.statusHistory ?? [];
  const newHistoryEntry = buildHistoryEntry(newStatus, actorId);
  const mergedHistory = [...existingHistory, newHistoryEntry];

  const updates: Partial<Booking> = {
    status: newStatus,
    ...extra,
    statusHistory: mergedHistory,
  };

  try {
    await updateDoc(docRef, updates as Record<string, unknown>);
  } catch (err) {
    throw new BookingError(
      `Failed to update booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Cancel booking ───────────────────────────────────────────────────────────

/**
 * Cancel a booking. Only the renter can cancel their own pending/confirmed booking.
 * Owner can cancel their own confirmed/in_progress booking.
 *
 * @throws BookingError if not authorized or invalid state
 */
export async function cancelBooking(
  bookingId: string,
  actorId: string,
  actorRole: 'renter' | 'driver'
): Promise<void> {
  const docRef = doc(db, 'bookings', bookingId);

  let snap: Awaited<ReturnType<typeof getDoc>>;
  try {
    snap = await getDoc(docRef);
  } catch (err) {
    throw new BookingError(
      `Failed to fetch booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!snap.exists()) {
    throw new BookingError('Booking not found', BookingErrorCodes.NOT_FOUND, 404);
  }

  const current = snap.data() as Booking;

  // Verify actor is authorized
  const isRenter = current.renterId === actorId;
  // driverId field semantically represents the assigned driver's uid.
  const isAssignedDriver = current.driverId === actorId;

  if (actorRole === 'renter' && !isRenter) {
    throw new BookingError('Not authorized', BookingErrorCodes.PERMISSION_DENIED, 403);
  }

  if (actorRole === 'driver' && !isAssignedDriver) {
    throw new BookingError('Not authorized', BookingErrorCodes.PERMISSION_DENIED, 403);
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[current.status as BookingStatus];
  if (!allowed.includes('cancelled')) {
    throw new BookingError(
      `Cannot cancel a booking in '${current.status}' state`,
      BookingErrorCodes.INVALID_STATUS_TRANSITION
    );
  }

  // Build merged history
  const existingHistory = current.statusHistory ?? [];
  const mergedHistory = [
    ...existingHistory,
    buildHistoryEntry('cancelled', actorId),
  ];

  try {
    await updateDoc(docRef, {
      status: 'cancelled',
      statusHistory: mergedHistory,
    } as Record<string, unknown>);
  } catch (err) {
    throw new BookingError(
      `Failed to cancel booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Accept booking (owner accepts and assigns their van) ────────────────────

/**
 * Owner accepts a pending booking and assigns their van.
 * Verifies:
 * - Booking is in 'pending' state
 * - The driver (owner) is currently online
 * - The vanId belongs to the accepting owner
 *
 * @throws BookingError if booking not found, not pending, driver not online, or van not owned
 */
export async function acceptBooking(
  bookingId: string,
  driverId: string,
  vanId: string
): Promise<void> {
  const bookingRef = doc(db, 'bookings', bookingId);
  const vanRef = doc(db, 'vans', vanId);

  // Fetch booking
  let bookingSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    bookingSnap = await getDoc(bookingRef);
  } catch (err) {
    throw new BookingError(
      `Failed to fetch booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!bookingSnap.exists()) {
    throw new BookingError('Booking not found', BookingErrorCodes.NOT_FOUND, 404);
  }

  const booking = bookingSnap.data() as Booking;

  if (booking.status !== 'pending') {
    throw new BookingError(
      `Booking is '${booking.status}', expected 'pending'`,
      BookingErrorCodes.BOOKING_NOT_PENDING
    );
  }

  // Verify driver is online
  let driverSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    driverSnap = await getDoc(doc(db, 'drivers', driverId));
  } catch (err) {
    throw new BookingError(
      `Failed to fetch driver state: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!driverSnap.exists() || !(driverSnap.data() as { isOnline: boolean }).isOnline) {
    throw new BookingError(
      'You must be online to accept bookings',
      BookingErrorCodes.PERMISSION_DENIED
    );
  }

  // Verify van ownership
  let vanSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    vanSnap = await getDoc(vanRef);
  } catch (err) {
    throw new BookingError(
      `Failed to fetch van: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!vanSnap.exists()) {
    throw new BookingError('Van not found', BookingErrorCodes.NOT_FOUND, 404);
  }

  const van = vanSnap.data() as { driverId: string };

  if (van.driverId !== driverId) {
    throw new BookingError(
      'You do not own this van',
      BookingErrorCodes.VAN_NOT_OWNED,
      403
    );
  }

  // Build history
  const existingHistory = booking.statusHistory ?? [];
  const mergedHistory = [
    ...existingHistory,
    buildHistoryEntry('confirmed', driverId),
  ];

  try {
    await updateDoc(bookingRef, {
      status: 'confirmed',
      driverId,
      vanId,
      confirmedAt: new Date().toISOString(),
      statusHistory: mergedHistory,
    } as Record<string, unknown>);
  } catch (err) {
    throw new BookingError(
      `Failed to accept booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Start booking (confirmed → in_progress) ──────────────────────────────────

/**
 * Mark a confirmed booking as in_progress.
 * Only the assigned owner can start their booking.
 *
 * @throws BookingError if not authorized or not in 'confirmed' state
 */
export async function startBooking(
  bookingId: string,
  driverId: string
): Promise<void> {
  const docRef = doc(db, 'bookings', bookingId);

  let snap: Awaited<ReturnType<typeof getDoc>>;
  try {
    snap = await getDoc(docRef);
  } catch (err) {
    throw new BookingError(
      `Failed to fetch booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!snap.exists()) {
    throw new BookingError('Booking not found', BookingErrorCodes.NOT_FOUND, 404);
  }

  const current = snap.data() as Booking;

  if (current.driverId !== driverId) {
    throw new BookingError('Not authorized', BookingErrorCodes.PERMISSION_DENIED, 403);
  }

  if (current.status !== 'confirmed') {
    throw new BookingError(
      `Cannot start booking in '${current.status}' state`,
      BookingErrorCodes.INVALID_STATUS_TRANSITION
    );
  }

  const existingHistory = current.statusHistory ?? [];
  const mergedHistory = [
    ...existingHistory,
    buildHistoryEntry('in_progress', driverId),
  ];

  try {
    await updateDoc(docRef, {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      statusHistory: mergedHistory,
    } as Record<string, unknown>);
  } catch (err) {
    throw new BookingError(
      `Failed to start booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Complete booking ─────────────────────────────────────────────────────────

/**
 * Mark an in_progress booking as completed.
 * Only the assigned owner can complete their booking.
 *
 * @throws BookingError if not authorized or not in 'in_progress' state
 */
export async function completeBooking(
  bookingId: string,
  driverId: string
): Promise<void> {
  const docRef = doc(db, 'bookings', bookingId);

  let snap: Awaited<ReturnType<typeof getDoc>>;
  try {
    snap = await getDoc(docRef);
  } catch (err) {
    throw new BookingError(
      `Failed to fetch booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!snap.exists()) {
    throw new BookingError('Booking not found', BookingErrorCodes.NOT_FOUND, 404);
  }

  const current = snap.data() as Booking;

  if (current.driverId !== driverId) {
    throw new BookingError('Not authorized', BookingErrorCodes.PERMISSION_DENIED, 403);
  }

  if (current.status !== 'in_progress') {
    throw new BookingError(
      `Cannot complete booking in '${current.status}' state`,
      BookingErrorCodes.INVALID_STATUS_TRANSITION
    );
  }

  const existingHistory = current.statusHistory ?? [];
  const mergedHistory = [
    ...existingHistory,
    buildHistoryEntry('completed', driverId),
  ];

  try {
    await updateDoc(docRef, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      statusHistory: mergedHistory,
    } as Record<string, unknown>);
  } catch (err) {
    throw new BookingError(
      `Failed to complete booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Get a single booking ─────────────────────────────────────────────────────

/**
 * Fetch a single booking by ID.
 * Returns null if not found.
 * Propagates Firestore errors as BookingError.
 */
export async function getBooking(bookingId: string): Promise<Booking> {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new BookingError('Booking not found', BookingErrorCodes.NOT_FOUND, 404);
    }
    return { id: docSnap.id, ...docSnap.data() } as Booking;
  } catch (err) {
    if (err instanceof BookingError) throw err;
    throw new BookingError(
      `Failed to fetch booking: ${(err as Error).message}`,
      BookingErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Get bookings by status ───────────────────────────────────────────────────

export async function getBookingsByStatus(
  userId: string,
  role: 'driver' | 'renter',
  status: BookingStatus
): Promise<Booking[]> {
  const field = role === 'driver' ? 'driverId' : 'renterId';
  const q = query(
    collection(db, 'bookings'),
    where(field, '==', userId),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}