import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Intercept all network requests to see what's happening with Places API
let placesRequests = [];
page.on('request', req => {
  if (req.url().includes('places.googleapis.com')) {
    placesRequests.push({ url: req.url(), method: req.method(), headers: req.headers() });
  }
});

page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    try {
      const body = await resp.text();
      console.log(`Places API ${resp.status()}:`, body.substring(0, 300));
    } catch {}
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(800);

const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(2500);

console.log('\nTotal Places API requests:', placesRequests.length);
if (placesRequests.length > 0) {
  console.log('First request URL:', placesRequests[0].url.substring(0, 200));
}

await browser.close();
