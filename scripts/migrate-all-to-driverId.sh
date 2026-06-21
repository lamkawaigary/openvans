#!/bin/bash
# Comprehensive migration: align all legacy 'owner' / 'ownerId' data to new
# 'driver' / 'driverId' schema.
#
# What it does:
#   1. Lists all docs in users, drivers, vans, bookings, notifications collections
#   2. users:  role 'owner' → 'driver'
#   3. drivers: if has ownerId (no driverId) → add driverId = ownerId
#   4. vans:    if has ownerId (no driverId) → add driverId = ownerId
#   5. bookings: if has ownerId (no driverId) → add driverId = ownerId
#   6. With --cleanup: also remove ownerId field after copy
#
# Idempotent: skips docs that already have driverId
# Uses OAuth access token from `firebase login` (cloud-platform scope = full admin)

set -e
PROJECT="opensystem-857b2"
DB="(default)"

CLEANUP=false
if [ "$1" = "--cleanup" ]; then CLEANUP=true; fi

ok() { echo "  ✅ $1"; }
skip() { echo "  ⏭  $1"; }
fail() { echo "  ❌ $1"; exit 1; }
section() { echo ""; echo "━━━ $1 ━━━"; }

# Get OAuth access token
TOKEN_JSON=$(firebase login:list --json 2>&1)
ACCESS_TOKEN=$(echo "$TOKEN_JSON" | jq -r '.result[0].tokens.access_token')
EMAIL=$(echo "$TOKEN_JSON" | jq -r '.result[0].user.email')
echo "🔑 Using OAuth token for: $EMAIL"
echo "🧹 Cleanup mode: $CLEANUP"

# Helper: PATCH a doc's field (additive — only adds, doesn't remove)
patch_field() {
  local COLL=$1
  local DOC=$2
  local FIELD=$3
  local VALUE=$4
  curl -s -X PATCH \
    "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/$DB/documents/$COLL/$DOC?updateMask.fieldPaths=$FIELD" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"fields\":{\"$FIELD\":{\"stringValue\":\"$VALUE\"}}}" > /dev/null
}

# Helper: PATCH a doc to truly delete a field (empty body + updateMask)
delete_field() {
  local COLL=$1
  local DOC=$2
  local FIELD=$3
  curl -s -X PATCH \
    "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/$DB/documents/$COLL/$DOC?updateMask.fieldPaths=$FIELD" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' > /dev/null
}

# Helper: query all docs in a collection
list_docs() {
  local COLL=$1
  curl -s -X POST \
    "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/$DB/documents:runQuery" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"$COLL\"}]}}" \
  | jq -c '.[] | select(.document != null) | {id: .document.name | split("/") | last, fields: .document.fields}'
}

# ========== 1. USERS: role 'owner' → 'driver' ==========
section "1. Users: role 'owner' → 'driver'"
USER_DOCS=$(list_docs "users")
echo "$USER_DOCS" | while read -r DOC; do
  ID=$(echo "$DOC" | jq -r '.id')
  ROLE=$(echo "$DOC" | jq -r '.fields.role.stringValue // empty')
  if [ "$ROLE" = "owner" ]; then
    patch_field "users" "$ID" "role" "driver"
    ok "$ID: role owner → driver"
  else
    skip "$ID: role=$ROLE (no change)"
  fi
done

# ========== 2. DRIVERS: ownerId → driverId ==========
section "2. Drivers: ownerId → driverId"
DRIVER_DOCS=$(list_docs "drivers")
echo "$DRIVER_DOCS" | while read -r DOC; do
  ID=$(echo "$DOC" | jq -r '.id')
  OWNER_ID=$(echo "$DOC" | jq -r '.fields.ownerId.stringValue // empty')
  DRIVER_ID=$(echo "$DOC" | jq -r '.fields.driverId.stringValue // empty')

  if [ -n "$DRIVER_ID" ]; then
    skip "$ID: already has driverId=$DRIVER_ID"
  elif [ -n "$OWNER_ID" ]; then
    patch_field "drivers" "$ID" "driverId" "$OWNER_ID"
    ok "$ID: copied ownerId=$OWNER_ID → driverId"
    if [ "$CLEANUP" = "true" ]; then
      delete_field "drivers" "$ID" "ownerId"
      ok "$ID: removed ownerId (cleanup)"
    fi
  else
    skip "$ID: no ownerId, no driverId (skip)"
  fi
done

# ========== 3. VANS: ownerId → driverId ==========
section "3. Vans: ownerId → driverId"
VAN_DOCS=$(list_docs "vans")
echo "$VAN_DOCS" | while read -r DOC; do
  ID=$(echo "$DOC" | jq -r '.id')
  PLATE=$(echo "$DOC" | jq -r '.fields.plateNumber.stringValue')
  OWNER_ID=$(echo "$DOC" | jq -r '.fields.ownerId.stringValue // empty')
  DRIVER_ID=$(echo "$DOC" | jq -r '.fields.driverId.stringValue // empty')

  if [ -n "$DRIVER_ID" ]; then
    skip "$ID ($PLATE): already has driverId=$DRIVER_ID"
  elif [ -n "$OWNER_ID" ]; then
    patch_field "vans" "$ID" "driverId" "$OWNER_ID"
    ok "$ID ($PLATE): copied ownerId → driverId"
    if [ "$CLEANUP" = "true" ]; then
      delete_field "vans" "$ID" "ownerId"
      ok "$ID ($PLATE): removed ownerId (cleanup)"
    fi
  else
    skip "$ID ($PLATE): no ownerId, no driverId (skip)"
  fi
done

# ========== 4. BOOKINGS: ownerId → driverId ==========
section "4. Bookings: ownerId → driverId"
BOOKING_DOCS=$(list_docs "bookings")
echo "$BOOKING_DOCS" | while read -r DOC; do
  ID=$(echo "$DOC" | jq -r '.id')
  STATUS=$(echo "$DOC" | jq -r '.fields.status.stringValue')
  OWNER_ID=$(echo "$DOC" | jq -r '.fields.ownerId.stringValue // empty')
  DRIVER_ID=$(echo "$DOC" | jq -r '.fields.driverId.stringValue // empty')

  if [ -n "$DRIVER_ID" ]; then
    skip "$ID ($STATUS): already has driverId"
  elif [ -n "$OWNER_ID" ]; then
    patch_field "bookings" "$ID" "driverId" "$OWNER_ID"
    ok "$ID ($STATUS): copied ownerId → driverId"
    if [ "$CLEANUP" = "true" ]; then
      delete_field "bookings" "$ID" "ownerId"
      ok "$ID ($STATUS): removed ownerId (cleanup)"
    fi
  else
    skip "$ID ($STATUS): no ownerId (pending or never assigned, skip)"
  fi
done

# ========== 5. NOTIFICATIONS: scan (sanity check, no legacy fields expected) ==========
section "5. Notifications: scan (no migration expected)"
NOTIF_DOCS=$(list_docs "notifications")
NOTIF_COUNT=$(echo "$NOTIF_DOCS" | wc -l | tr -d ' ')
ok "$NOTIF_COUNT notification doc(s) found — no ownerId field expected"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Migration complete"
if [ "$CLEANUP" = "true" ]; then
  echo "   Mode: MIGRATE + CLEANUP (ownerId field removed)"
else
  echo "   Mode: MIGRATE ONLY (ownerId field kept for safety)"
  echo "   Re-run with --cleanup to remove ownerId fields"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
