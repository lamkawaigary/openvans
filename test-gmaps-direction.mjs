import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.text().includes('error') || msg.text().includes('Error')) {
    console.log('ERR:', msg.text().substring(0, 200));
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Test directions service from within the Google Maps context
const dirsResult = await page.evaluate(async () => {
  if (!window.google?.maps?.DirectionsService) {
    return { error: 'DirectionsService not available' };
  }
  
  const service = new window.google.maps.DirectionsService();
  
  return new Promise((resolve) => {
    service.route(
      {
        origin: { lat: 22.3193, lng: 114.1694 },
        destination: { lat: 22.3168, lng: 114.1780 },
        travelMode: window.google.maps.TravelMode.DRIVE,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          const route = result.routes[0];
          const leg = route.legs[0];
          resolve({
            distance: leg.distance.value, // meters
            duration: leg.duration.value, // seconds
            distanceKm: (leg.distance.value / 1000).toFixed(1),
            durationMins: Math.round(leg.duration.value / 60),
          });
        } else {
          resolve({ error: 'status=' + status });
        }
      }
    );
  });
});

console.log('Directions result:', JSON.stringify(dirsResult, null, 2));

await browser.close();
