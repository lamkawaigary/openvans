import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.text().includes('AddressSearchInput') || msg.text().includes('Step1Form') || msg.text().includes('getPlaceCoords') || msg.text().includes('OpenVans')) {
    console.log(`[${msg.type()}] ${msg.text()}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
await btn.click();
await page.waitForTimeout(500);

const inputs = await page.$$('input');
console.log('Inputs found:', inputs.length);
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(3000);

// Check what divs have the suggestion text
const suggestionInfo = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  return allDivs
    .filter(d => d.textContent?.includes('干諾道'))
    .map(d => ({ text: d.textContent?.substring(0, 80), style: d.getAttribute('style') }))
    .slice(0, 10);
});
console.log('Suggestion divs:', JSON.stringify(suggestionInfo, null, 2));

// Click the one that looks right
await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  console.log('Clicking suggestion, found:', suggs.length);
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(3000);

console.log('Done');

await browser.close();
