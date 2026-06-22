import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AppNotification } from '../types';

// ─── Create a notification ───────────────────────────────────────────────────

/**
 * Create a notification for a user.
 * Used by the system to notify users of booking status changes.
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  type?: AppNotification['type'];
  linkTo?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'notifications'), {
    userId: params.userId,
    title: params.title,
    body: params.body,
    type: params.type ?? 'info',
    isRead: false,
    linkTo: params.linkTo ?? null,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// ─── Subscribe to own notifications ───────────────────────────────────────────

/**
 * Subscribe to real-time notifications for the current user.
 * Returns unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q,
    (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      callback(notifs);
    },
    (err) => {
      console.error('[Firestore] subscribeToNotifications error:', err);
      callback([]);
    }
  );
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

/**
 * Mark one or all notifications as read.
 */
export async function markAsRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snap = await getDocs(q);
  const writes = snap.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { isRead: true }));
  await Promise.all(writes);
}

// ─── Booking helpers ──────────────────────────────────────────────────────────

/**
 * Notify renter that a driver accepted their booking.
 */
export async function notifyBookingAccepted(
  renterId: string,
  bookingId: string,
  driverName: string,
  vehicleInfo: string
): Promise<void> {
  await createNotification({
    userId: renterId,
    title: '✅ 司機已接單！',
    body: `${driverName} 司機已接受你的訂單（${vehicleInfo}）`,
    type: 'success',
    linkTo: `/trips/${bookingId}`,
  });
}

/**
 * Notify renter that their booking was cancelled by driver.
 */
export async function notifyBookingCancelled(
  renterId: string,
  bookingId: string,
  reason?: string
): Promise<void> {
  await createNotification({
    userId: renterId,
    title: '❌ 訂單已取消',
    body: reason ? `司機取消了訂單：${reason}` : '司機取消了你的訂單',
    type: 'warning',
    linkTo: `/trips/${bookingId}`,
  });
}

/**
 * Notify renter that driver is en route (started delivery).
 */
export async function notifyDriverEnRoute(
  renterId: string,
  bookingId: string
): Promise<void> {
  await createNotification({
    userId: renterId,
    title: '🚚 司機已出發！',
    body: '司機正在送貨途中，請留意到達時間',
    type: 'info',
    linkTo: `/trips/${bookingId}`,
  });
}

/**
 * Notify renter that delivery is complete.
 */
export async function notifyBookingCompleted(
  renterId: string,
  bookingId: string,
  finalPrice?: number
): Promise<void> {
  await createNotification({
    userId: renterId,
    title: '✔️ 送貨完成！',
    body: finalPrice
      ? `你的訂單已完成，費用 HK$${finalPrice}`
      : '你的訂單已完成，感謝使用 OpenVans！',
    type: 'success',
    linkTo: `/trips/${bookingId}`,
  });
}

/**
 * Notify the recipient that a new chat message arrived.
 * Triggered by client immediately after sendTextMessage / sendImageMessage.
 * The bell UI subscribes to notifications so the user sees a toast + counter.
 */
export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  bookingId: string,
  preview: string
): Promise<void> {
  // Truncate preview to keep toast short
  const trimmed = preview.length > 60 ? preview.slice(0, 57) + '…' : preview;
  await createNotification({
    userId: recipientId,
    title: `💬 ${senderName} 傳咗訊息俾你`,
    body: trimmed || '（圖片）',
    type: 'info',
    linkTo: `/trip/${bookingId}`,
  });
}
