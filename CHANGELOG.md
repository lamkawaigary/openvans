# OpenVans Change Log

## 2026-06-11 - Bear (Hermes Agent) Session

### Firestore Rules — `/firestore.rules`
- **FIX**: Removed `ownerId == null` bypass that allowed any authenticated user to read ALL pending bookings
- **FIX**: Removed hardcoded ownerId check that blocked owner from even reading their own vans
- **Tenant booking cancellation**: Now allows tenants to cancel `pending` OR `confirmed` bookings (previously only `pending`)
- **Van read access**: Restricted to `ownerId == request.auth.uid` OR admin role
- **Deploy status**: Pending — needs `firebase login:ci` token from Gary to deploy

### Orphan Van State — `src/context/DriverContext.tsx`
- **NEW**: Added `repairOrphanVan()` function to clean up stale van/driver state on app crash/disconnect
- **ONMOUNT**: `OnlineToggle` component now calls `repairOrphanVan()` on mount
- **ONLINE**: `goOnline()` now calls `repairOrphanVan()` before setting driver online
- **PURPOSE**: Prevents ghost "online" state where driver shows available but app crashed/disconnected

### Real-time Notifications — `src/services/notifications.ts` + UI
- **NEW**: `src/services/notifications.ts` — Notification creation + Firestore subscription
- **Driver → Tenant flow**:
  - `onBookingAccepted` → notify tenant: "Booking accepted!"
  - `onTripStarted` → notify tenant: "Trip started"
  - `onTripCompleted` → notify tenant: "Trip completed"
- **UI**: `src/components/NotificationBell.tsx` — Toast notification display for tenants
- **INTEGRATED**: Added `<NotificationBell />` to `TripsPage` header
- **NEXT**: NotificationBell still needs to subscribe to Firestore notifications on mount (tenant side)

---

## TODO / Pending

### Must Do
- [ ] Deploy Firestore rules (needs Gary's `firebase login:ci` token)
- [ ] Add NotificationBell subscription to tenant's `TripsPage` or `App.tsx`
- [ ] Test full booking flow: tenant books → driver accepts → driver starts → driver completes → tenant rates

### Should Do
- [ ] Pricing engine (pricing.ts + UI in booking flow)
- [ ] Admin dashboard (admin.tsx + admin routes)
- [ ] Waypoint/intermediate stop UI for multi-destination trips
- [ ] Van listing page for tenants

### Nice to Have
- [ ] Email confirmation on booking (Firebase Functions)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Trip history + receipts

---

## Project Info

- **Path**: `/Users/gary/Desktop/Agent Pro/open-van/`
- **Firebase Project**: `openvans` (openvans-xxxx)
- **Tech Stack**: React + Vite + Firebase v9 (Firestore, Auth, Storage)
- **Context**: Gary (嗰) / OpenVans is a van rental platform — tenants book vans, drivers accept/fulfill trips
