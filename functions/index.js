// ============================================
// OpenVan — Cloud Functions
// ============================================
// Functions:
//   1. geocode                  — Nominatim proxy with HK bbox filter (HTTP)
//   2. cleanupExpiredChats      — HTTP-triggered 7-day chat cleanup
//                                 (Phase 8 — invoked by GitHub Actions cron daily)
//   3. cleanupExpiredChatsSchedule — Scheduler version (kept for future
//                                    when GCP permissions allow scheduler)

const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// ============================================
// Geocode (existing — unchanged)
// ============================================
exports.geocode = onRequest({ region: 'us-central1', minInstances: 0 }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const q = req.query.q || '';
  if (!q) { res.status(400).json({ error: 'missing q' }); return; }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=10&addressdetails=1&viewbox=113.8,22.1,114.5,22.6`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'OpenVanApp/1.0 (Firebase Functions geocoding)',
        'Accept': 'application/json'
      }
    });
    const data = await resp.json();
    const hk = Array.isArray(data) ? data.filter(p => {
      const lat = parseFloat(p.lat || 0), lon = parseFloat(p.lon || 0);
      const name = String(p.display_name || '');
      return (lat >= 22.1 && lat <= 22.6 && lon >= 113.8 && lon <= 114.5) ||
             name.includes('Hong Kong') || name.includes('香港');
    }) : [];
    res.json(hk.slice(0, 8));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// cleanupExpiredChats (HTTP trigger) — Phase 8
// ============================================
// Triggered by GitHub Actions cron workflow (.github/workflows/chat-cleanup.yml)
// once per day. Deletes /bookings/{id}/messages/* + Storage files for bookings
// whose terminal status (completed, or cancelled-after-confirmed) is older
// than 7 days. Booking doc itself is preserved.
//
// Security: requires `?secret=<CRON_SECRET>` query param, set as GitHub repo
// secret and embedded in the workflow file.
exports.chatCleanup = onRequest(
  { region: 'asia-east2', minInstances: 0, timeoutSeconds: 540 },
  async (req, res) => {
    // CORS + method check
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'GET/POST only' });
      return;
    }

    // Verify shared secret (set in Firebase Functions config + GitHub secret)
    const expected = process.env.CRON_SECRET;
    if (expected) {
      const provided = req.query.secret || req.headers['x-cron-secret'];
      if (provided !== expected) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
    }

    try {
      const result = await runCleanup();
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error('[cleanup] Failed:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

// ============================================
// cleanupExpiredChatsSchedule (alternative)
// ============================================
// Kept for future use when GCP permissions allow. Uncomment / re-deploy when
// Cloud Scheduler is enabled on the project.
//
// exports.cleanupExpiredChatsSchedule = onSchedule(
//   { schedule: '0 3 * * *', timeZone: 'Asia/Hong_Kong', region: 'asia-east2' },
//   async () => { await runCleanup(); }
// );

// ============================================
// Shared cleanup logic
// ============================================
async function runCleanup() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cutoffIso = sevenDaysAgo.toISOString();

  let totalBookings = 0;
  let totalMessages = 0;
  let totalFiles = 0;

  // Helper: delete a booking's messages sub-collection + storage files
  async function cleanupBookingMessages(bookingRef) {
    const messagesSnap = await bookingRef.collection('messages').get();
    if (messagesSnap.empty) return;

    // Collect storage paths before deleting docs
    const storagePaths = [];
    messagesSnap.docs.forEach((msgDoc) => {
      const data = msgDoc.data();
      if (Array.isArray(data.images)) {
        data.images.forEach((img) => {
          if (img && typeof img.storagePath === 'string') {
            storagePaths.push(img.storagePath);
          }
        });
      }
    });

    // Batch-delete messages (max 500 per Firestore batch)
    const BATCH_SIZE = 500;
    const docs = messagesSnap.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    totalMessages += messagesSnap.size;

    // Delete Storage files (ignoreNotFound: file may already be gone)
    const bucket = storage.bucket();
    await Promise.all(
      storagePaths.map((path) =>
        bucket
          .file(path)
          .delete({ ignoreNotFound: true })
          .then(() => { totalFiles += 1; })
          .catch(() => { /* silent */ })
      )
    );
  }

  // 1) Completed bookings older than 7 days
  const completedSnap = await db
    .collection('bookings')
    .where('status', '==', 'completed')
    .where('completedAt', '<', cutoffIso)
    .limit(100)
    .get();

  for (const doc of completedSnap.docs) {
    try {
      await cleanupBookingMessages(doc.ref);
      totalBookings += 1;
    } catch (err) {
      console.error(`[cleanup] Failed booking ${doc.id} (completed):`, err.message);
    }
  }

  // 2) Cancelled bookings that were ever confirmed + 7d past cancellation
  const cancelledSnap = await db
    .collection('bookings')
    .where('status', '==', 'cancelled')
    .limit(200)
    .get();

  for (const doc of cancelledSnap.docs) {
    try {
      const data = doc.data();
      const statusHistory = Array.isArray(data.statusHistory) ? data.statusHistory : [];
      const wasEverConfirmed = statusHistory.some((h) => h && h.status === 'confirmed');
      if (!wasEverConfirmed) continue;

      const lastCancelled = statusHistory
        .filter((h) => h && h.status === 'cancelled')
        .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))[0];
      if (!lastCancelled || !lastCancelled.at) continue;
      if (String(lastCancelled.at) >= cutoffIso) continue;

      await cleanupBookingMessages(doc.ref);
      totalBookings += 1;
    } catch (err) {
      console.error(`[cleanup] Failed booking ${doc.id} (cancelled):`, err.message);
    }
  }

  console.log(
    `[cleanupExpiredChats] Done — bookings: ${totalBookings}, messages: ${totalMessages}, files: ${totalFiles}`
  );
  return { totalBookings, totalMessages, totalFiles };
}
