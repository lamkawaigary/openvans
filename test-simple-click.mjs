import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Only capture errors and important events
page.on('pageerror', err => console.log('[CRASH]', err.message.substring(0, 100)));

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

// Open panel
await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(400);

// Type
const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(2500);

// Find and click the suggestion div
const div = await page.$('div:has-text("干諾道中香港")');
console.log('Found div:', !!div);
if (div) {
  await div.click({ timeout: 3000 });
  console.log('Clicked!');
  await page.waitForTimeout(2000);
  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Inputs:', vals);
}

await browser.close();
console.log('Done');
