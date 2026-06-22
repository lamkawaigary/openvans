// ============================================
// Phone Number Utilities (Phase 8 — Chat & Call)
// ============================================
//
// Convention: user.phone is stored in E.164 format ("+85291234567", "+8613812345678")
// This module handles:
// - Masking phone for display before booking is confirmed
// - Building tel: links (always E.164 with +)
// - Validating E.164 shape
//
// Library: libphonenumber-js (~30KB gzipped, tree-shakeable)

import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

export const MAX_PHONE_LENGTH = 20; // sanity check on input

/**
 * Mask a phone number for display when the viewer is not yet authorized to
 * see the full number (e.g. before booking is confirmed).
 *
 * Examples:
 *   "+85291234567"     → "+852 9123 ****"
 *   "+8613812345678"   → "+86 138 **** 5678"
 *   "+15551234567"     → "+1 555 *** 4567"
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';

  // Try to parse with libphonenumber-js for proper handling
  const parsed = parsePhoneNumberFromString(phone);
  if (parsed && parsed.isValid()) {
    const cc = '+' + parsed.countryCallingCode;
    const national = parsed.nationalNumber; // digits only
    const len = national.length;

    if (len <= 4) {
      // Too short to meaningfully mask
      return `${cc} ${national}`;
    }

    if (len <= 7) {
      // Short number — mask middle
      const head = national.slice(0, Math.ceil(len / 2));
      return `${cc} ${head} ****`;
    }

    // Standard: keep first 4 digits, mask middle, keep last 4
    const head = national.slice(0, 4);
    const tail = national.slice(-4);
    return `${cc} ${head} **** ${tail}`;
  }

  // Fallback for invalid input — just show first 4 + mask
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 4)} ****`;
}

/**
 * Validate that a phone string is in E.164 format and is a real number.
 * Returns true if libphonenumber-js can parse it as a valid number.
 */
export function isValidE164(phone: string): boolean {
  if (!phone || !phone.startsWith('+')) return false;
  if (phone.length > MAX_PHONE_LENGTH) return false;
  return isValidPhoneNumber(phone);
}

/**
 * Build a tel: link from an E.164 phone number.
 * - Always uses E.164 with leading + for cross-platform dialer support
 * - iOS, Android, and most modern browsers handle tel:+E164 correctly
 */
export function buildTelLink(phone: string): string {
  // Strip everything except digits and leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

/**
 * Booking phone-visibility rule.
 * Phone is exposed only after the driver has accepted the booking.
 * This protects renter + driver phone numbers from leaking to other drivers
 * browsing the pending pool.
 *
 * Returns true if viewerUid is a party AND status allows phone exposure.
 */
export function canViewPhone(
  booking: { renterId: string; driverId?: string; status: string },
  viewerUid: string
): boolean {
  const isParty = booking.renterId === viewerUid || booking.driverId === viewerUid;
  if (!isParty) return false;
  return ['confirmed', 'in_progress', 'completed'].includes(booking.status);
}

/**
 * Determine the "other party" in a booking from the viewer's perspective.
 * - If viewer is renter → returns driver uid (or null if not assigned)
 * - If viewer is driver → returns renter uid
 */
export function getOtherPartyId(
  booking: { renterId: string; driverId?: string },
  viewerUid: string
): string | null {
  if (viewerUid === booking.renterId) return booking.driverId ?? null;
  if (viewerUid === booking.driverId) return booking.renterId;
  return null;
}

/**
 * Determine viewer's role in a booking.
 */
export function getViewerRole(
  booking: { renterId: string; driverId?: string },
  viewerUid: string
): 'renter' | 'driver' | null {
  if (viewerUid === booking.renterId) return 'renter';
  if (viewerUid === booking.driverId) return 'driver';
  return null;
}