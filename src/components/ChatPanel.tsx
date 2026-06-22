// ============================================
// ChatPanel — order-scoped chat UI (Phase 8)
// ============================================
// Mounted inside TripDetailPage. Shows:
// - Header: title + other-party name + PhoneCallButton
// - Scrollable message list (auto-scroll to bottom on new message)
// - Pending / Locked banner when applicable
// - Composer: text input + image picker + send button (disabled when locked)
//
// Both renter and driver use this same component (viewer role inferred).

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToMessages,
  sendTextMessage,
  sendImageMessage,
  markChatAsRead,
  isChatLocked,
  isChatActive,
  MAX_IMAGES,
} from '../services/chat';
import { getOtherPartyId, getViewerRole } from '../utils/phoneFormat';
import { PhoneCallButton } from './PhoneCallButton';
import { MessageBubble } from './MessageBubble';
import { notifyNewMessage } from '../services/notifications';
import { colors, sp, rd } from '../styles';
import type { Booking, ChatMessage, User } from '../types';

interface ChatPanelProps {
  booking: Booking;
}

export default function ChatPanel({ booking }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const viewerRole = user ? getViewerRole(booking, user.uid) : null;
  const otherPartyId = user ? getOtherPartyId(booking, user.uid) : null;
  const locked = isChatLocked(booking);
  const active = isChatActive(booking);

  // Subscribe messages + auto-scroll
  useEffect(() => {
    const unsub = subscribeToMessages(booking.id, (msgs) => {
      setMessages(msgs);
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    });
    return unsub;
  }, [booking.id]);

  // Fetch other-party user (for PhoneCallButton + subtitle)
  useEffect(() => {
    if (!otherPartyId) {
      setOtherUser(null);
      return;
    }
    getDoc(doc(db, 'users', otherPartyId))
      .then((snap) => {
        if (snap.exists()) setOtherUser({ uid: snap.id, ...snap.data() } as User);
      })
      .catch(() => setOtherUser(null));
  }, [otherPartyId]);

  // Mark as read whenever chat is open and there are messages
  const markRead = useCallback(() => {
    if (viewerRole && user) {
      void markChatAsRead(booking.id, viewerRole);
    }
  }, [booking.id, viewerRole, user]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  useEffect(() => {
    if (messages.length > 0) markRead();
  }, [messages.length, markRead]);

  const handleSend = async () => {
    if (!user || !viewerRole || sending) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await sendTextMessage(booking.id, user.uid, viewerRole, user.name, trimmed);
      // Best-effort notification to the other party (failures are silent)
      if (otherPartyId) {
        notifyNewMessage(otherPartyId, user.name, booking.id, trimmed).catch(() => {});
      }
      setText('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (files: FileList | null) => {
    if (!user || !viewerRole || !files || sending) return;
    const fileArr = Array.from(files).slice(0, MAX_IMAGES);
    if (fileArr.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await sendImageMessage(booking.id, user.uid, viewerRole, user.name, fileArr);
      // Best-effort notification
      if (otherPartyId) {
        const preview = fileArr.length === 1 ? '📷 圖片' : `📷 ${fileArr.length} 張圖片`;
        notifyNewMessage(otherPartyId, user.name, booking.id, preview).catch(() => {});
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!user || !viewerRole) return null;

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.titleIcon}>💬</span>
          <span style={s.title}>對話</span>
          {otherUser && <span style={s.subtitle}>與 {otherUser.name}</span>}
        </div>
        {otherUser && (
          <PhoneCallButton
            phone={otherUser.phone}
            otherName={otherUser.name}
            booking={booking}
            viewerUid={user.uid}
          />
        )}
      </div>

      <div ref={listRef} style={s.list}>
        {messages.length === 0 ? (
          <div style={s.empty}>
            {active ? '未有訊息 — 打個招呼啦！' : locked ? '對話已鎖死' : '未有訊息'}
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={user.uid === msg.senderId}
            />
          ))
        )}
      </div>

      {booking.status === 'pending' && viewerRole === 'renter' && (
        <div style={s.hint}>⏳ 司機接單後可以即時通訊</div>
      )}
      {locked && (
        <div style={s.hint}>🔒 對話已鎖死（訂單完成 / 取消 1 小時後）</div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {active && !locked && (
        <div style={s.composer}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleImageSelect(e.target.files)}
          />
          <button
            type="button"
            style={s.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="加入圖片"
          >
            📷
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={viewerRole === 'renter' ? '傳訊息俾司機…' : '傳訊息俾乘客…'}
            maxLength={2000}
            style={s.input}
            disabled={sending}
          />
          <button
            type="button"
            style={text.trim() && !sending ? s.sendBtn : s.sendBtnDisabled}
            onClick={handleSend}
            disabled={!text.trim() || sending}
            aria-label="傳送"
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: colors.surface,
    borderRadius: rd.lg,
    padding: sp.md,
    display: 'flex',
    flexDirection: 'column',
    gap: sp.sm,
    border: `1px solid ${colors.border}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp.sm,
    paddingBottom: sp.xs,
    borderBottom: `1px solid ${colors.border}`,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
    flex: 1,
    minWidth: 0,
  },
  titleIcon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: 700, color: colors.darkGrey },
  subtitle: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: sp.xs,
    maxHeight: 320,
    overflowY: 'auto',
    padding: `${sp.xs}px 0`,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    padding: `${sp.lg}px 0`,
  },
  hint: {
    background: colors.background,
    borderRadius: rd.sm,
    padding: `${sp.xs}px ${sp.sm}px`,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    background: colors.errorBg,
    color: colors.error,
    borderRadius: rd.sm,
    padding: `${sp.xs}px ${sp.sm}px`,
    fontSize: 12,
  },
  composer: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
    paddingTop: sp.xs,
    borderTop: `1px solid ${colors.border}`,
  },
  attachBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 22,
    padding: 4,
    lineHeight: 1,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: `1px solid ${colors.border}`,
    borderRadius: rd.full,
    padding: `${sp.xs}px ${sp.sm}px`,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: colors.brand,
    color: colors.primary,
    border: 'none',
    borderRadius: '50%',
    width: 36,
    height: 36,
    fontSize: 18,
    cursor: 'pointer',
    flexShrink: 0,
    fontWeight: 700,
  },
  sendBtnDisabled: {
    background: colors.lightGrey,
    color: colors.textMuted,
    border: 'none',
    borderRadius: '50%',
    width: 36,
    height: 36,
    fontSize: 18,
    cursor: 'not-allowed',
    flexShrink: 0,
  },
};
