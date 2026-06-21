const { execSync } = require('child_process');
const TOKEN = execSync("firebase login:list --json 2>&1 | jq -r '.result[0].tokens.access_token'").toString().trim();
const PROJECT="opensystem-857b2";

(async () => {
  const resp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'bookings' }] } })
  }).then(r => r.json());

  console.log('All bookings:');
  (resp || []).filter(d => d.document).forEach(d => {
    const f = d.document.fields;
    const id = d.document.name.split('/').pop();
    const status = f.status?.stringValue || '(no status)';
    const driverId = f.driverId?.stringValue || '(no driver)';
    const renter = f.renterId?.stringValue?.slice(0, 12) || '?';
    const pickup = f.pickupAddress?.stringValue?.slice(0, 30) || '?';
    console.log(`  ${id} status=${status} driverId=${driverId.slice(0, 12)} renter=${renter} pickup=${pickup}`);
  });
})();
