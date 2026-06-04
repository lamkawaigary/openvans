import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let apiCalls = [];
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    const body = await resp.text();
    const type = resp.url().includes('searchText') ? 'SEARCH' : 'DETAILS';
    console.log(`[API] ${resp.status()} ${type}`);
    apiCalls.push(type);
  }
});
page.on('console', msg => {
  const t = msg.text();
  if (t.includes('OpenVans') || t.includes('selectPickup') || t.includes('onSelect')) {
    console.log(`[console] ${t.substring(0, 200)}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(500);

const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(4000);

console.log('API calls after typing:', apiCalls);

// Click the suggestion (the inner one with cursor:pointer and padding:12px)
await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const div = allDivs.find(d => 
    d.style.cursor === 'pointer' && 
    d.style.padding === '12px 16px' &&
    d.textContent === '干諾道中香港'
  );
  console.log('Found div:', !!div, div?.style.position, div?.style.zIndex);
  if (div) div.click();
});
await page.waitForTimeout(5000);

console.log('API calls after click:', apiCalls);

const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('Input values:', vals);

await browser.close();
