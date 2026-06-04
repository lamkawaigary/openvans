const { onRequest } = require('firebase-functions/v2/https');
const fetch = require('node-fetch');

exports.geocode = onRequest({ region: 'us-central1', minInstances: 0 }, async (req, res) => {
  // CORS headers
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
    // Filter to HK by bounding box and name
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
