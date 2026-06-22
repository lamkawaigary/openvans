// ============================================
// UnreadBadge — chat unread count + badge UI (Phase 8)
// ============================================
// useUnreadCount hook subscribes to messages + booking.readState and returns
// the number of messages not yet seen by the viewer.
//
// UnreadBadge renders a red circle with the count (hidden at 0).

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { subscribeToMessages } from '../services/chat';
import { colors } from '../styles';
import type { ChatMessage } from '../types';

export function useUnreadCount(
  bookingId: string,
  viewerUid: string,
  viewerRole: 'renter' | 'driver' | null
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!viewerRole) {
      setCount(0);
      return;
    }

    let msgs: ChatMessage[] = [];
    let lastReadAt: string | undefined;

    const recompute = () => {
      const othersMessages = msgs.filter((m) => m.senderId !== viewerUid);
      if (!lastReadAt) {
        setCount(othersMessages.length);
      } else {
        const lr = lastReadAt;
        setCount(othersMessages.filter((m) => m.createdAt > lr).length);
      }
    };

    const unsubMsgs = subscribeToMessages(bookingId, (m) => {
      msgs = m;
      recompute();
    });

    const unsubBooking = onSnapshot(
      doc(db, 'bookings', bookingId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as { readState?: { renter?: { lastReadAt?: string }; driver?: { lastReadAt?: string } } };
        lastReadAt = data.readState?.[viewerRole]?.lastReadAt;
        recompute();
      }
    );

    return () => {
      unsubMsgs();
      unsubBooking();
    };
  }, [bookingId, viewerUid, viewerRole]);

  return count;
}

interface BadgeProps {
  count: number;
}

export function UnreadBadge({ count }: BadgeProps) {
  if (count <= 0) return null;
  return (
    <span style={s.badge}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

const s: Record<string, React.CSSProperties> = {
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    background: colors.error,
    color: colors.white,
    borderRadius: '50%',
    minWidth: 18,
    height: 18,
    fontSize: 11,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    boxShadow: `0 0 0 2px ${colors.white}`,
  },
};
