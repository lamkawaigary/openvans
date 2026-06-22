// ============================================
// MessageBubble — single chat message render (Phase 8)
// ============================================
// Handles text + image grid + sender label + timestamp.
// Click image → full-screen lightbox overlay.

import { useState } from 'react';
import { formatTime } from '../utils/helpers';
import { colors, sp, rd } from '../styles';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  isMine: boolean;
}

export function MessageBubble({ message, isMine }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const hasImages = !!message.images && message.images.length > 0;
  const imgs = message.images ?? [];

  return (
    <>
      <div style={{ ...s.row, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
        <div style={isMine ? s.bubbleMine : s.bubbleTheirs}>
          {!isMine && <div style={s.senderName}>{message.senderName}</div>}
          {message.text && <div style={s.text}>{message.text}</div>}
          {hasImages && (
            <div
              style={{
                ...s.imageGrid,
                gridTemplateColumns: imgs.length === 1 ? '1fr' : '1fr 1fr',
              }}
            >
              {imgs.map((img, idx) => (
                <img
                  key={idx}
                  src={img.url}
                  alt=""
                  style={s.image}
                  loading="lazy"
                  onClick={() => setLightboxUrl(img.url)}
                />
              ))}
            </div>
          )}
          <div style={s.time}>{formatTime(message.createdAt)}</div>
        </div>
      </div>
      {lightboxUrl && (
        <div style={s.lightbox} onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" style={s.lightboxImg} />
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    marginBottom: 4,
  },
  bubbleMine: {
    background: colors.brand,
    color: colors.primary,
    borderRadius: `${rd.lg}px ${rd.lg}px 4px ${rd.lg}px`,
    padding: `${sp.xs}px ${sp.sm}px`,
    maxWidth: '75%',
  },
  bubbleTheirs: {
    background: colors.lightGrey,
    color: colors.textPrimary,
    borderRadius: `${rd.lg}px ${rd.lg}px ${rd.lg}px 4px`,
    padding: `${sp.xs}px ${sp.sm}px`,
    maxWidth: '75%',
  },
  senderName: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.primaryBlue,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  imageGrid: {
    display: 'grid',
    gap: 4,
    marginTop: 4,
  },
  image: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    borderRadius: rd.sm,
    cursor: 'pointer',
    display: 'block',
  },
  time: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.45)',
    textAlign: 'right',
    marginTop: 2,
  },
  lightbox: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    cursor: 'zoom-out',
    padding: 16,
  },
  lightboxImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
};
