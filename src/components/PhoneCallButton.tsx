// ============================================
// PhoneCallButton — tap-to-call with phone visibility (Phase 8)
// ============================================
// Renders a tel: link when the viewer is authorized to see the phone
// (booking.status in confirmed / in_progress / completed).
// Otherwise renders a masked display with a lock icon.
//
// Phone is masked via libphonenumber-js to keep "+852 9123 ****" shape.

import { canViewPhone, maskPhone, buildTelLink } from '../utils/phoneFormat';
import { colors, sp, rd } from '../styles';
import type { Booking } from '../types';

interface Props {
  phone: string;
  otherName?: string;
  booking: Booking;
  viewerUid: string;
}

export function PhoneCallButton({ phone, otherName, booking, viewerUid }: Props) {
  const visible = canViewPhone(booking, viewerUid);

  if (!visible) {
    return (
      <div style={s.masked} title="司機接單後可見對方電話">
        <span style={s.lockIcon}>🔒</span>
        <span style={s.maskedText}>{maskPhone(phone)}</span>
      </div>
    );
  }

  return (
    <a
      href={buildTelLink(phone)}
      style={s.btn}
      aria-label={`致電${otherName ?? '對方'}`}
    >
      <span style={s.icon}>📞</span>
      <span style={s.phone}>{maskPhone(phone)}</span>
    </a>
  );
}

const s: Record<string, React.CSSProperties> = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: `${sp.xs}px ${sp.sm}px`,
    background: colors.successBg,
    color: colors.success,
    border: `1.5px solid ${colors.success}`,
    borderRadius: rd.full,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  icon: { fontSize: 14 },
  phone: {
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  masked: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: `${sp.xs}px ${sp.sm}px`,
    background: colors.background,
    color: colors.textMuted,
    border: `1px dashed ${colors.border}`,
    borderRadius: rd.full,
    fontSize: 12,
    flexShrink: 0,
  },
  lockIcon: { fontSize: 12 },
  maskedText: {
    fontFamily: 'monospace',
  },
};
