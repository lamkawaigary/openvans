import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const dirsResult = await page.evaluate(async () => {
  try {
    if (typeof google === 'undefined' || !google.maps || !google.maps.DirectionsService) {
      return { error: 'DirectionsService not available', google: typeof google };
    }
    const service = new google.maps.DirectionsService();
    return new Promise((resolve) => {
      service.route(
        {
          origin: new google.maps.LatLng(22.3193, 114.1694),
          destination: new google.maps.LatLng(22.3168, 114.1780),
          travelMode: 'DRIVING',
        },
        (result, status) => {
          if (status === 'OK' && result) {
            const leg = result.routes[0].legs[0];
            resolve({
              distanceM: leg.distance.value,
              durationS: leg.duration.value,
              distanceKm: (leg.distance.value / 1000).toFixed(1),
              durationMin: Math.round(leg.duration.value / 60),
            });
          } else {
            resolve({ error: 'status=' + status });
          }
        }
      );
    });
  } catch (e) {
    return { error: String(e) };
  }
});

console.log('Directions:', JSON.stringify(dirsResult, null, 2));
await browser.close();
