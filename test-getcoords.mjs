import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => logs.push(msg.text()));

// Manually test getPlaceCoords from browser context
await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

// Call getPlaceCoords directly in the page
const result = await page.evaluate(async () => {
  // Get the API key from the page context
  const apiKey = 'AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg';
  const placeId = 'ChIJ26Oyy3wABDQR1ZmTP7C5-YE';
  
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=location&key=${apiKey}`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'location',
      },
    }
  );
  
  const data = await response.json();
  return { status: response.status, data };
});

console.log('Result:', JSON.stringify(result, null, 2));
console.log('Logs:', logs.filter(l => l.includes('getPlace') || l.includes('OpenVans')));

await browser.close();
