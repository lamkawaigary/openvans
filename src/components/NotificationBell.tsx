import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications } from '../services/notifications';
import { toast } from 'sonner';

/**
 * In-app notification bell + toast system.
 * Subscribes to Firestore notifications and shows toast popups for new unread items.
 * Designed for the TripsPage / main app shell.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToNotifications(user.uid, (notifs) => {
      const unreadNotifs = notifs.filter(n => !n.isRead);
      setUnread(unreadNotifs.length);

      // Show toast for newly seen unread notifications
      unreadNotifs.forEach(n => {
        if (!seen.has(n.id)) {
          setSeen(prev => new Set([...prev, n.id]));
          toast(n.title, {
            description: n.body,
            duration: 5000,
          });
        }
      });
    });

    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ position: 'relative', cursor: 'pointer' }}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#333"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          background: '#e53935',
          color: '#fff',
          borderRadius: '50%',
          width: 16,
          height: 16,
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  );
}
