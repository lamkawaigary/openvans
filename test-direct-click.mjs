import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
page.on('pageerror', err => console.log('[PAGE ERROR]', err.message.substring(0, 100)));

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
await btn.click();
await page.waitForTimeout(500);

// Type pickup
const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(3000);

// Click suggestion using Playwright's click (not evaluate)
const suggestion = await page.$('div[style*="cursor: pointer"][style*="padding: 12px"]');
console.log('Found suggestion element:', !!suggestion);

if (suggestion) {
  await suggestion.click();
  await page.waitForTimeout(3000);
  console.log('Clicked via Playwright');
  
  // Check input values
  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Input values:', vals);
}

await browser.close();
