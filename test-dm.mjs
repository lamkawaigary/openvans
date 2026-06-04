import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Test with distance matrix embedded in Google Maps
await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const dmResult = await page.evaluate(async () => {
  const key = 'AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg';
  // Try without mode param
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=22.3193,114.1694&destinations=22.3168,114.1780&key=${key}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('DM result (no mode):', JSON.stringify(dmResult, null, 2));

// Try with just key - no mode
const dm2 = await page.evaluate(async () => {
  const key = 'AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg';
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=22.3193,114.1694&destination=22.3168,114.1780&key=${key}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, statusText: data.status, routesCount: data.routes?.length };
  } catch (e) {
    return { error: e.message };
  }
});
console.log('Directions result:', JSON.stringify(dm2, null, 2));

await browser.close();
