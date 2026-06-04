import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`));

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(400);

const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(3000);

await page.click('div:has-text("干諾道中香港")');
console.log('Pickup clicked');
await page.waitForTimeout(2500);

const inputs = await page.$$('input');
await inputs[1].click();
await inputs[1].type('旺角', { delay: 60 });
await page.waitForTimeout(3000);

// Click using exact text of the suggestion
await page.click('div:has-text("香港旺角")');
console.log('Dropoff clicked');
await page.waitForTimeout(2500);

const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('Inputs:', vals);

const coords = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll('span'));
  return spans.filter(s => s.textContent === '📍').length;
});
console.log('Coord hints (📍):', coords);

await browser.close();
