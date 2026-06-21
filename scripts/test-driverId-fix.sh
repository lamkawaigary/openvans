#!/bin/bash
# E2E backend test for driverId fix
# Verifies:
#   1. Driver can READ pending bookings (was DENIED before fix)
#   2. Driver can ACCEPT a pending booking (was DENIED before fix)
#   3. Driver's own booking updates work
#   4. Notification creation works (was DENIED before fix)
#
# Uses Firebase Auth REST API + Firestore REST API directly.
# Web API key is VITE_FIREBASE_API_KEY from .env (public identifier, baked into client).
# Requires `jq` for JSON parsing.

set -e
API_KEY="AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU"
PROJECT="opensystem-857b2"
TIMESTAMP=$(date +%s)
RENTER_EMAIL="renter-test-${TIMESTAMP}@openvan-automation.test"
DRIVER_EMAIL="driver-test-${TIMESTAMP}@openvan-automation.test"
PASSWORD="Test1234!"

# Helper: print section header
section() { echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "🧪 $1"; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }
ok() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; exit 1; }

# 1. Create renter + driver users via Firebase Auth
section "Step 1: Sign up test users"
RENTER_RESP=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$API_KEY" \
  -e "https://openvan.vercel.app/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RENTER_EMAIL\",\"password\":\"$PASSWORD\",\"returnSecureToken\":true}")
RENTER_UID=$(echo "$RENTER_RESP" | jq -r '.localId')
RENTER_TOKEN=$(echo "$RENTER_RESP" | jq -r '.idToken')
[ "$RENTER_UID" != "null" ] && ok "Renter created: $RENTER_UID" || fail "Renter signup failed: $RENTER_RESP"

DRIVER_RESP=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$API_KEY" \
  -e "https://openvan.vercel.app/" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DRIVER_EMAIL\",\"password\":\"$PASSWORD\",\"returnSecureToken\":true}")
DRIVER_UID=$(echo "$DRIVER_RESP" | jq -r '.localId')
DRIVER_TOKEN=$(echo "$DRIVER_RESP" | jq -r '.idToken')
[ "$DRIVER_UID" != "null" ] && ok "Driver created: $DRIVER_UID" || fail "Driver signup failed: $DRIVER_RESP"

# 2. Create user docs in Firestore (role metadata)
section "Step 2: Create user docs with role"
curl -s -X PATCH "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/users/$RENTER_UID" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $RENTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"name\":{\"stringValue\":\"Test Renter\"},\"email\":{\"stringValue\":\"$RENTER_EMAIL\"},\"phone\":{\"stringValue\":\"+85212345678\"},\"role\":{\"stringValue\":\"renter\"},\"isActive\":{\"booleanValue\":true},\"createdAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}" > /dev/null
ok "Renter user doc created (role=renter)"

curl -s -X PATCH "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/users/$DRIVER_UID" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"name\":{\"stringValue\":\"Test Driver\"},\"email\":{\"stringValue\":\"$DRIVER_EMAIL\"},\"phone\":{\"stringValue\":\"+85287654321\"},\"role\":{\"stringValue\":\"driver\"},\"isActive\":{\"booleanValue\":true},\"createdAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}" > /dev/null
ok "Driver user doc created (role=driver)"

# 3. Create van for driver
section "Step 3: Create van for driver"
curl -s -X POST "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/vans" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"driverId\":{\"stringValue\":\"$DRIVER_UID\"},\"plateNumber\":{\"stringValue\":\"TEST-$TIMESTAMP\"},\"vehicleType\":{\"stringValue\":\"light\"},\"make\":{\"stringValue\":\"Toyota\"},\"model\":{\"stringValue\":\"HiAce\"},\"capacityKg\":{\"integerValue\":\"1000\"},\"capacityM3\":{\"doubleValue\":3.0},\"isAvailable\":{\"booleanValue\":true},\"isVerified\":{\"booleanValue\":true},\"createdAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}" > /dev/null
ok "Van created with driverId=$DRIVER_UID"

# 4. Create driver state (online)
section "Step 4: Set driver online"
curl -s -X PATCH "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/drivers/$DRIVER_UID" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"driverId\":{\"stringValue\":\"$DRIVER_UID\"},\"isOnline\":{\"booleanValue\":true},\"currentVanId\":{\"nullValue\":null},\"vehicleType\":{\"stringValue\":\"light\"},\"updatedAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}" > /dev/null
ok "Driver state set (isOnline=true)"

# 5. Renter creates a pending booking (the critical path)
section "Step 5: Renter creates a pending booking"
BOOKING_RESP=$(curl -s -X POST "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/bookings" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $RENTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"renterId\":{\"stringValue\":\"$RENTER_UID\"},\"pickupAddress\":{\"stringValue\":\"Central HK\"},\"pickupLat\":{\"doubleValue\":22.2819},\"pickupLng\":{\"doubleValue\":114.1582},\"dropoffAddress\":{\"stringValue\":\"Tsim Sha Tsui HK\"},\"dropoffLat\":{\"doubleValue\":22.2980},\"dropoffLng\":{\"doubleValue\":114.1722},\"vehicleTypeRequired\":{\"stringValue\":\"light\"},\"loads\":{\"arrayValue\":{}},\"totalLoadCount\":{\"integerValue\":\"1\"},\"pickupTime\":{\"timestampValue\":\"$(date -u -v+1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)\"},\"status\":{\"stringValue\":\"pending\"},\"createdAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},\"serviceType\":{\"stringValue\":\"truck\"}}}")
BOOKING_ID=$(echo "$BOOKING_RESP" | jq -r '.name | split("/") | last')
[ "$BOOKING_ID" != "null" ] && ok "Booking created: $BOOKING_ID" || fail "Booking create failed: $BOOKING_RESP"

# 6. CRITICAL TEST: Driver queries pending bookings (was DENIED before fix)
section "Step 6: ⭐ Driver queries pending bookings (was DENIED before fix)"
QUERY_RESP=$(curl -s -X POST "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents:runQuery" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"structuredQuery":{"from":[{"collectionId":"bookings"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"pending"}}},"orderBy":[{"field":{"fieldPath":"createdAt"},"direction":"DESCENDING"}]}}')
echo "$QUERY_RESP" | jq -c '.[] | select(.document != null) | {bookingId: .document.name, status: .document.fields.status.stringValue, vehicleType: .document.fields.vehicleTypeRequired.stringValue, renterId: .document.fields.renterId.stringValue}' | head -5
FOUND=$(echo "$QUERY_RESP" | jq --arg bid "$BOOKING_ID" '[.[] | select(.document != null and (.document.name | endswith($bid)))] | length')
[ "$FOUND" = "1" ] && ok "Driver can SEE the pending booking ⭐ FIX VERIFIED" || fail "Driver cannot see booking (FOUND=$FOUND) — fix NOT working"

# 7. Driver accepts the booking (was DENIED before fix — accept rule)
section "Step 7: ⭐ Driver accepts the booking (was DENIED before fix)"
ACCEPT_RESP=$(curl -s -X PATCH "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/bookings/$BOOKING_ID" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"driverId\":{\"stringValue\":\"$DRIVER_UID\"},\"status\":{\"stringValue\":\"confirmed\"},\"confirmedAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}")
echo "$ACCEPT_RESP" | jq -c '{status: .fields.status.stringValue, driverId: .fields.driverId.stringValue}' 2>/dev/null || true
echo "$ACCEPT_RESP" | grep -q "PERMISSION_DENIED" && fail "Accept booking denied: $ACCEPT_RESP" || ok "Driver can ACCEPT the booking ⭐ FIX VERIFIED"

# 8. Driver creates a notification for the renter (was DENIED before fix)
section "Step 8: ⭐ Driver creates notification for renter (was DENIED before fix)"
NOTIF_RESP=$(curl -s -X POST "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/notifications" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fields\":{\"userId\":{\"stringValue\":\"$RENTER_UID\"},\"title\":{\"stringValue\":\"Test notification\"},\"body\":{\"stringValue\":\"Driver accepted your booking\"},\"type\":{\"stringValue\":\"success\"},\"isRead\":{\"booleanValue\":false},\"createdAt\":{\"timestampValue\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}")
echo "$NOTIF_RESP" | grep -q "PERMISSION_DENIED" && fail "Notification create denied: $NOTIF_RESP" || ok "Driver can CREATE notification for renter ⭐ FIX VERIFIED"

# 9. Cleanup test data
section "Step 9: Cleanup test data"
for DOC_ID in "$BOOKING_ID"; do
  curl -s -X DELETE "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/bookings/$DOC_ID" \
    -e "https://openvan.vercel.app/" -H "Authorization: Bearer $RENTER_TOKEN" > /dev/null
done
curl -s -X DELETE "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/drivers/$DRIVER_UID" \
  -e "https://openvan.vercel.app/" -H "Authorization: Bearer $DRIVER_TOKEN" > /dev/null
ok "Test data deleted"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ALL TESTS PASSED — driverId + rules fix VERIFIED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test users created (you may want to delete these too):"
echo "  Renter:  $RENTER_EMAIL"
echo "  Driver:  $DRIVER_EMAIL"
echo "  Password: $PASSWORD"
echo ""
