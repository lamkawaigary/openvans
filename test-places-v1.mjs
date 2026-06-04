import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Test the Places API v1 directly via fetch in the page context
const apiResult = await page.evaluate(async () => {
  const key = 'AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg';
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify({
      textQuery: '干諾道, 香港',
      languageCode: 'zh-TW',
    }),
  });
  const data = await resp.json();
  return data;
});
console.log('Places API v1 result:', JSON.stringify(apiResult, null, 2));

await browser.close();
