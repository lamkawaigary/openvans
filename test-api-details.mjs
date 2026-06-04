import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let placesCalls = [];
page.on('request', req => {
  if (req.url().includes('places.googleapis.com')) {
    placesCalls.push({ url: req.url(), method: req.method() });
  }
});

page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    const body = await resp.text();
    console.log(`Places API ${resp.status()} ${resp.request().method()}:`, body.substring(0, 400));
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(800);

const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(2500);

// Click first suggestion - check what text it actually has
const suggestionInfo = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggDivs = allDivs.filter(d => d.textContent === '干諾道中');
  return suggDivs.map(d => ({
    text: d.textContent,
    parent: d.parentElement?.textContent?.substring(0, 100),
    rect: d.getBoundingClientRect()
  }));
});
console.log('Suggestion divs with text "干諾道中":', suggestionInfo.length);

// Click it
await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggDivs = allDivs.filter(d => d.textContent === '干諾道中');
  if (suggDivs.length > 0) suggDivs[0].click();
});

await page.waitForTimeout(2500);

console.log('\nAll Places API calls:', placesCalls.length);
placesCalls.forEach((c, i) => {
  console.log(`Call ${i+1}: ${c.method} ${c.url.substring(0, 150)}`);
});

await browser.close();
