import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    console.log(`Places API: ${resp.status()} - ${(await resp.text()).substring(0, 100)}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(400);

// Type pickup and click suggestion
const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(3000);

await page.click('div:has-text("干諾道中香港")');
console.log('Pickup clicked');
await page.waitForTimeout(2500);

// Type dropoff
const inputs = await page.$$('input');
await inputs[1].click();
await inputs[1].type('旺角', { delay: 60 });
await page.waitForTimeout(3000);

// Check what divs with 旺角 look like
const旺角Divs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('div'))
    .filter(d => d.textContent?.includes('旺角'))
    .map(d => d.textContent)
    .slice(0, 10);
});
console.log('旺角 divs:',旺角Divs);

// Try clicking using text content
await page.click('text=旺角');
await page.waitForTimeout(2500);

const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('Inputs:', vals);

await browser.close();
