#!/bin/bash
# List all bookings
TOKEN=$(firebase login:list --json 2>&1 | jq -r '.result[0].tokens.access_token')
curl -s -X POST "https://firestore.googleapis.com/v1/projects/opensystem-857b2/databases/(default)/documents:runQuery" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"structuredQuery":{"from":[{"collectionId":"bookings"}]}}' \
| jq -r '.[] | select(.document != null) | "\(.document.name | split("/") | last) | status=\(.document.fields.status.stringValue) | driverId=\(.document.fields.driverId.stringValue // "none") | vehicle=\(.document.fields.vehicleTypeRequired.stringValue)"'
