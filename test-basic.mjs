import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture ALL console messages
page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
});

page.on('pageerror', err => {
  console.log('[PAGE ERROR]', err.message.substring(0, 200));
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

console.log('=== Done waiting ===');
console.log('Page title:', await page.title());

await browser.close();
