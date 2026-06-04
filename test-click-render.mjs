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
    console.log(`Places API ${resp.status()}:`, body.substring(0, 200));
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

// Get all visible text on page to understand what's rendered
const allText = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  return allDivs
    .filter(d => d.textContent && d.textContent.trim().length > 2)
    .map(d => d.textContent.trim())
    .filter(t => t.length > 2 && t.length < 100)
    .slice(0, 30);
});
console.log('Page text items:', allText);

// Get the dropdown div if any
const dropdownInfo = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const dropdown = allDivs.find(d => d.style.position === 'absolute' && d.style.zIndex === '999');
  if (dropdown) {
    return { text: dropdown.textContent?.substring(0, 100), children: dropdown.children.length };
  }
  return null;
});
console.log('Dropdown:', dropdownInfo);

await browser.close();
