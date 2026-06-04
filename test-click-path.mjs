import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
page.on('pageerror', err => console.log('[CRASH]', err.message.substring(0, 100)));
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    const body = await resp.text();
    console.log(`API: ${resp.status()} ${resp.request().method()} - ${body.substring(0, 150)}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(400);

const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(3000);

// Log the full dropdown structure
const dropdownInfo = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggestionItems = allDivs.filter(d => d.style?.cursor === 'pointer' && d.textContent?.includes('道'));
  return suggestionItems.map(d => ({
    text: d.textContent?.substring(0, 80),
    cursor: d.style.cursor,
    padding: d.style.padding,
    parentText: d.parentElement?.textContent?.substring(0, 50),
  }));
});
console.log('Suggestion items:', JSON.stringify(dropdownInfo, null, 2));

// Click using the exact text match  
await page.click('div[style*="cursor: pointer"]:has-text("干諾道中香港")');
console.log('Clicked!');
await page.waitForTimeout(3000);

const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('Inputs after:', vals);

await browser.close();
