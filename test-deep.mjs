import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Intercept every console message
page.on('console', msg => {
  const t = msg.text();
  if (t.includes('OpenVans') || t.includes('handle') || t.includes('onChange') || t.includes('onSelect') || t.includes('select')) {
    console.log(`[console] ${t.substring(0, 200)}`);
  }
});

// Also intercept all API calls  
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com') && resp.request().method() === 'GET') {
    console.log(`[API] Details: ${await resp.text()}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(500);

const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 80 });
await page.waitForTimeout(4000);

await page.click('div:has-text("干諾道中香港")');
await page.waitForTimeout(5000);

const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('[RESULT] Input values:', vals);

await browser.close();
