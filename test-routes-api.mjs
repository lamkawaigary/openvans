import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Test Routes API from browser context
const routesResult = await page.evaluate(async () => {
  const key = 'AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg';
  try {
    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: 22.3193, longitude: 114.1694 } } },
        destination: { location: { latLng: { latitude: 22.3168, longitude: 114.1780 } } },
        travelMode: 'DRIVE',
      }),
    });
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('Routes API result:', JSON.stringify(routesResult, null, 2));

// Test Distance Matrix API
const dmResult = await page.evaluate(async () => {
  const key = 'AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg';
  try {
    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=22.3193,114.1694&destinations=22.3168,114.1780&key=${key}&mode=driving`
    );
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('Distance Matrix result:', JSON.stringify(dmResult, null, 2));

await browser.close();
