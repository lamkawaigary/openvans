import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  const t = msg.text();
  if (t.includes('selectPickup') || t.includes('onSelect') || t.includes('OpenVans')) {
    console.log(`[${msg.type()}] ${t}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(500);

const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(3000);

// Check the full input value before click
const valBefore = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input'));
  return inputs.map(i => i.value);
});
console.log('Value before click:', JSON.stringify(valBefore));

// Click the suggestion
await page.click('div:has-text("干諾道中香港")');
await page.waitForTimeout(5000);

// Check the full input value after click
const valAfter = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input'));
  return inputs.map(i => i.value);
});
console.log('Value after click:', JSON.stringify(valAfter));

// Check if there are errors in console
console.log('Done');

await browser.close();
