import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Van } from '../types';

// Subscribe to all vans (for renters to browse)
export function subscribeToVans(callback: (vans: Van[]) => void) {
  const q = query(collection(db, 'vans'), where('isAvailable', '==', true));
  return onSnapshot(q, snap => {
    const vans = snap.docs.map(d => ({ id: d.id, ...d.data() } as Van));
    callback(vans);
  });
}

// Subscribe to owner's own vans
export function subscribeToOwnerVans(ownerId: string, callback: (vans: Van[]) => void) {
  const q = query(collection(db, 'vans'), where('ownerId', '==', ownerId));
  return onSnapshot(q, snap => {
    const vans = snap.docs.map(d => ({ id: d.id, ...d.data() } as Van));
    callback(vans);
  });
}

// Add a new van
export async function addVan(data: Omit<Van, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'vans'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// Update van
export async function updateVan(vanId: string, data: Partial<Van>): Promise<void> {
  await updateDoc(doc(db, 'vans', vanId), data);
}

// Delete van
export async function deleteVan(vanId: string): Promise<void> {
  await deleteDoc(doc(db, 'vans', vanId));
}

// Get single van
export async function getVan(vanId: string): Promise<Van | null> {
  const snap = await getDoc(doc(db, 'vans', vanId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Van;
}

// Get vans by type
export async function getVansByType(vehicleType: Van['vehicleType']): Promise<Van[]> {
  const q = query(
    collection(db, 'vans'),
    where('vehicleType', '==', vehicleType),
    where('isAvailable', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Van));
}
