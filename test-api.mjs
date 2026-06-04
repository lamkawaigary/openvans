import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Intercept Places API calls only
let apiCalls = [];
page.on('request', req => {
  if (req.url().includes('places.googleapis.com')) {
    apiCalls.push({ url: req.url().substring(0, 120), method: req.method() });
  }
});
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    try {
      const body = await resp.json();
      const shortUrl = resp.url().substring(0, 100);
      console.log(`← ${resp.status()} ${resp.request().method()} ${shortUrl}`);
      console.log('  Body:', JSON.stringify(body).substring(0, 200));
    } catch {}
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

// Open the location panel
const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
await btn.click();
await page.waitForTimeout(500);

// Type pickup
const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 100 });
await page.waitForTimeout(3500);

// Check if there are 2 calls now (search + expected details call)
console.log('Total API calls so far:', apiCalls.length);
console.log('Calls:', apiCalls.map(c => c.method + ' ' + c.url.substring(0,80)));

// Click suggestion
const clicked = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  if (suggs.length > 0) { suggs[0].click(); return true; }
  return false;
});
console.log('Clicked:', clicked);
await page.waitForTimeout(3000);

console.log('API calls after click:', apiCalls.length);
apiCalls.slice(1).forEach(c => console.log('  ', c.method, c.url.substring(0, 100)));

await browser.close();
