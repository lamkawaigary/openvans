// ============================================
// Chat Service (Phase 8)
// ============================================
// Firestore sub-collection: /bookings/{bookingId}/messages/{messageId}
// Storage path:          bookings/{bookingId}/messages/{messageId}/{idx}.jpg
//
// Responsibilities:
// - Subscribe to messages for a booking (real-time, onSnapshot)
// - Send text / image messages (with client-side compression to ≤500KB)
// - Mark chat as read (writes booking.readState.{role}.lastReadAt)
// - Lifecycle helpers: isChatActive, isChatLocked

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../firebase/config';
import type { ChatMessage, ChatImage, Booking } from '../types';
import { compressImage, getImageDimensions } from '../utils/imageCompress';

export const MAX_TEXT_LENGTH = 2000;
export const MAX_IMAGES = 3;
export const LOCK_DELAY_MS = 60 * 60 * 1000; // 1 hour

export const ChatErrorCodes = {
  PERMISSION_DENIED: 'CHAT_PERMISSION_DENIED',
  TOO_MANY_IMAGES: 'TOO_MANY_IMAGES',
  TEXT_TOO_LONG: 'TEXT_TOO_LONG',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
} as const;

export type ChatErrorCode = typeof ChatErrorCodes[keyof typeof ChatErrorCodes];

export class ChatError extends Error {
  code: ChatErrorCode;
  constructor(message: string, code: ChatErrorCode) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
  }
}

// ─── Subscribe to messages (real-time) ─────────────────────────

export function subscribeToMessages(
  bookingId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'bookings', bookingId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      callback(msgs);
    },
    (err) => {
      // Without this handler permission-denied silently kills the listener.
      console.error('[Firestore] subscribeToMessages error:', err);
      callback([]);
    }
  );
}

// ─── Send text message ─────────────────────────────────────────

export async function sendTextMessage(
  bookingId: string,
  senderId: string,
  senderRole: 'renter' | 'driver',
  senderName: string,
  text: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ChatError('訊息唔可以空白', ChatErrorCodes.TEXT_TOO_LONG);
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new ChatError(
      `訊息太長（上限 ${MAX_TEXT_LENGTH} 字）`,
      ChatErrorCodes.TEXT_TOO_LONG
    );
  }
  try {
    const ref = await addDoc(collection(db, 'bookings', bookingId, 'messages'), {
      bookingId,
      senderId,
      senderRole,
      senderName,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    throw new ChatError(
      `傳送失敗: ${(err as Error).message}`,
      ChatErrorCodes.FIRESTORE_ERROR
    );
  }
}

// ─── Send image message (with client-side compression) ────────

export async function sendImageMessage(
  bookingId: string,
  senderId: string,
  senderRole: 'renter' | 'driver',
  senderName: string,
  files: File[]
): Promise<string> {
  if (files.length === 0) {
    throw new ChatError('冇圖可傳', ChatErrorCodes.TOO_MANY_IMAGES);
  }
  if (files.length > MAX_IMAGES) {
    throw new ChatError(`最多 ${MAX_IMAGES} 張圖`, ChatErrorCodes.TOO_MANY_IMAGES);
  }

  // Compress first (Web Worker, off main thread)
  const compressedFiles = await Promise.all(files.map((f) => compressImage(f)));

  // Create the message doc upfront so we have its ID for storage paths
  let messageId: string;
  try {
    const ref = await addDoc(collection(db, 'bookings', bookingId, 'messages'), {
      bookingId,
      senderId,
      senderRole,
      senderName,
      images: [], // placeholder, filled after upload
      createdAt: new Date().toISOString(),
    });
    messageId = ref.id;
  } catch (err) {
    throw new ChatError(
      `建立訊息失敗: ${(err as Error).message}`,
      ChatErrorCodes.FIRESTORE_ERROR
    );
  }

  // Upload each image in parallel
  const images: ChatImage[] = await Promise.all(
    compressedFiles.map(async (file, idx) => {
      const path = `bookings/${bookingId}/messages/${messageId}/${idx}.jpg`;
      try {
        const ref = storageRef(storage, path);
        const snapshot = await uploadBytes(ref, file, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(snapshot.ref);
        const dims = await getImageDimensions(file);
        return {
          url,
          storagePath: path,
          width: dims?.width ?? 0,
          height: dims?.height ?? 0,
          sizeBytes: file.size,
        };
      } catch (err) {
        throw new ChatError(
          `上傳圖片失敗: ${(err as Error).message}`,
          ChatErrorCodes.UPLOAD_FAILED
        );
      }
    })
  );

  // Patch message doc with image refs
  try {
    await updateDoc(doc(db, 'bookings', bookingId, 'messages', messageId), {
      images,
    });
  } catch (err) {
    throw new ChatError(
      `更新訊息失敗: ${(err as Error).message}`,
      ChatErrorCodes.FIRESTORE_ERROR
    );
  }

  return messageId;
}

// ─── Mark as read ──────────────────────────────────────────────
// Writes booking.readState.{role}.lastReadAt — used by useUnreadCount hook
// to compute per-booking unread badge count.

export async function markChatAsRead(
  bookingId: string,
  role: 'renter' | 'driver'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      [`readState.${role}.lastReadAt`]: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal: silent fail; UI will mark on next open
    console.warn('[chat] markChatAsRead failed:', err);
  }
}

// ─── Lifecycle helpers ─────────────────────────────────────────

/** Chat is sendable when booking is confirmed or in_progress. */
export function isChatActive(booking: Booking): boolean {
  return booking.status === 'confirmed' || booking.status === 'in_progress';
}

/**
 * Chat input is locked (read-only) when:
 * - booking is completed OR cancelled
 * - AND booking was ever confirmed (i.e. real conversation happened)
 * - AND 1 hour has passed since the terminal status
 *
 * Cancelled-before-confirm skips the lock (no chat content to lock).
 */
export function isChatLocked(booking: Booking): boolean {
  if (!['completed', 'cancelled'].includes(booking.status)) return false;

  const terminalEntry = booking.statusHistory
    ?.filter((h) => h.status === booking.status)
    .sort((a, b) => b.at.localeCompare(a.at))[0];

  if (!terminalEntry) return false;

  if (booking.status === 'cancelled') {
    const wasEverConfirmed = booking.statusHistory?.some(
      (h) => h.status === 'confirmed'
    );
    if (!wasEverConfirmed) return false;
  }

  const lockAt = new Date(terminalEntry.at).getTime() + LOCK_DELAY_MS;
  return Date.now() >= lockAt;
}
