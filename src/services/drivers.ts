import {
  doc,
  updateDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { VehicleType } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DriverState {
  driverId: string;
  isOnline: boolean;
  currentVanId: string | null;
  vehicleType: VehicleType | null;
  currentLat: number | null;
  currentLng: number | null;
  updatedAt: string;
}

// ─── Error handling ──────────────────────────────────────────────────────────

export const DriverErrorCodes = {
  NOT_ONLINE: 'DRIVER_NOT_ONLINE',
  VAN_NOT_AVAILABLE: 'VAN_NOT_AVAILABLE',
  VAN_NOT_OWNED: 'VAN_NOT_OWNED',
  ALREADY_ONLINE: 'ALREADY_ONLINE',
  NOT_ONLINE_STATE: 'NOT_ONLINE_STATE',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
} as const;

export type DriverErrorCode = typeof DriverErrorCodes[keyof typeof DriverErrorCodes];

export class DriverError extends Error {
  code: DriverErrorCode;
  constructor(message: string, code: DriverErrorCode) {
    super(message);
    this.name = 'DriverError';
    this.code = code;
  }
}

// ─── Repair orphan van state ────────────────────────────────────────────────

/**
 * Repair orphan state: driver document exists but van is marked unavailable.
 * Call this on app startup / OnlineToggle mount.
 * Returns the repaired vanId if any, otherwise null.
 */
export async function repairOrphanVan(driverId: string): Promise<string | null> {
  const driverRef = doc(db, 'drivers', driverId);
  let driverSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    driverSnap = await getDoc(driverRef);
  } catch {
    return null;
  }

  if (!driverSnap.exists()) return null;

  const driver = driverSnap.data() as DriverState;
  if (!driver.isOnline || !driver.currentVanId) {
    // Driver is not actually online, clean up
    try {
      await deleteDoc(driverRef);
    } catch { /* ignore */ }
    return null;
  }

  // Driver doc exists and claims to be online — verify the van is actually unavailable
  const vanRef = doc(db, 'vans', driver.currentVanId);
  let vanSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    vanSnap = await getDoc(vanRef);
  } catch {
    return null;
  }

  if (!vanSnap.exists()) {
    // Van was deleted while driver was "online" — clean up driver doc
    try { await deleteDoc(driverRef); } catch { /* ignore */ }
    return null;
  }

  const van = vanSnap.data() as { isAvailable: boolean; driverId: string };
  if (van.isAvailable) {
    // Van was somehow marked available while driver doc says online — fix it
    try {
      await updateDoc(vanRef, { isAvailable: false });
    } catch { /* ignore */ }
  }

  // All good — driver is legitimately online with this van
  return driver.currentVanId;
}

// ─── Go online ───────────────────────────────────────────────────────────────

/**
 * Driver goes online with a selected van.
 * - Repairs any orphan state first
 * - Sets driver/{driverId} with online state
 * - Marks the selected van as unavailable
 *
 * @throws DriverError if van not found, not owned, or not available
 */
export async function goOnline(
  driverId: string,
  vanId: string,
  vehicleType: VehicleType
): Promise<void> {
  // Repair any orphan state from previous sessions first
  await repairOrphanVan(driverId);

  // Verify van ownership and availability
  const vanRef = doc(db, 'vans', vanId);
  let vanSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    vanSnap = await getDoc(vanRef);
  } catch (err) {
    throw new DriverError(
      `Failed to fetch van: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!vanSnap.exists()) {
    throw new DriverError('Van not found', DriverErrorCodes.VAN_NOT_AVAILABLE);
  }

  const van = vanSnap.data() as { driverId: string; isAvailable: boolean };

  if (van.driverId !== driverId) {
    throw new DriverError('You do not own this van', DriverErrorCodes.VAN_NOT_OWNED);
  }

  if (!van.isAvailable) {
    throw new DriverError('This van is not available', DriverErrorCodes.VAN_NOT_AVAILABLE);
  }

  // Set driver online state
  const driverRef = doc(db, 'drivers', driverId);
  try {
    await setDoc(driverRef, {
      driverId,
      isOnline: true,
      currentVanId: vanId,
      vehicleType: vehicleType ?? null,
      currentLat: null,
      currentLng: null,
      updatedAt: new Date().toISOString(),
    });

    // Mark van as unavailable
    await updateDoc(vanRef, { isAvailable: false });
  } catch (err) {
    throw new DriverError(
      `Failed to go online: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Go offline ───────────────────────────────────────────────────────────────

/**
 * Driver goes offline.
 * - Clears driver/{driverId} state
 * - Marks the previously selected van as available again
 *
 * @throws DriverError if offline operation fails
 */
export async function goOffline(driverId: string): Promise<void> {
  const driverRef = doc(db, 'drivers', driverId);
  let driverSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    driverSnap = await getDoc(driverRef);
  } catch (err) {
    throw new DriverError(
      `Failed to fetch driver state: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }

  const currentVanId = driverSnap.exists()
    ? (driverSnap.data() as DriverState).currentVanId
    : null;

  // Delete driver state — must succeed for offline to work
  try {
    await deleteDoc(driverRef);
  } catch (err) {
    throw new DriverError(
      `Failed to go offline: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }

  // Restore van availability — always runs, even if delete fails
  if (currentVanId) {
    const vanRef = doc(db, 'vans', currentVanId);
    try {
      await updateDoc(vanRef, { isAvailable: true });
    } catch (err) {
      // Non-fatal: log but don't throw — van restore is secondary
      console.error(`[Driver] Failed to restore van availability: ${(err as Error).message}`);
    }
  }
}

// ─── Update location ──────────────────────────────────────────────────────────

/**
 * Update driver's current location.
 * Only works if driver is online.
 *
 * @throws DriverError if driver not online
 */
export async function updateLocation(
  driverId: string,
  lat: number,
  lng: number
): Promise<void> {
  const driverRef = doc(db, 'drivers', driverId);
  let driverSnap: Awaited<ReturnType<typeof getDoc>>;
  try {
    driverSnap = await getDoc(driverRef);
  } catch (err) {
    throw new DriverError(
      `Failed to fetch driver: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }

  if (!driverSnap.exists() || !(driverSnap.data() as DriverState).isOnline) {
    throw new DriverError('Driver is not online', DriverErrorCodes.NOT_ONLINE_STATE);
  }

  try {
    await updateDoc(driverRef, {
      currentLat: lat,
      currentLng: lng,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new DriverError(
      `Failed to update location: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Subscribe to driver state ────────────────────────────────────────────────

/**
 * Subscribe to own driver state changes.
 */
export function subscribeToDriver(
  driverId: string,
  callback: (state: DriverState | null) => void
) {
  const driverRef = doc(db, 'drivers', driverId);
  return onSnapshot(driverRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        const data = snap.data();
        callback({
          driverId: data.driverId,
          isOnline: data.isOnline,
          currentVanId: data.currentVanId,
          vehicleType: data.vehicleType,
          currentLat: data.currentLat,
          currentLng: data.currentLng,
          updatedAt: data.updatedAt,
        });
      }
    },
    (err) => {
      console.error('[Firestore] subscribeToDriver error:', err);
      callback(null);
    }
  );
}

// ─── Get driver state ─────────────────────────────────────────────────────────

/**
 * Get current driver state (online/offline).
 */
export async function getDriver(driverId: string): Promise<DriverState | null> {
  try {
    const snap = await getDoc(doc(db, 'drivers', driverId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      driverId: data.driverId,
      isOnline: data.isOnline,
      currentVanId: data.currentVanId,
      vehicleType: data.vehicleType,
      currentLat: data.currentLat,
      currentLng: data.currentLng,
      updatedAt: data.updatedAt,
    };
  } catch (err) {
    throw new DriverError(
      `Failed to get driver: ${(err as Error).message}`,
      DriverErrorCodes.FIRESTORE_ERROR
    );
  }
}