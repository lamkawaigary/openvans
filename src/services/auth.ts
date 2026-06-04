import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { User } from '../types';

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as User;
}
