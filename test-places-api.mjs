import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Click fill button to reach step 1
const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1000);

// Intercept all network requests during typing
let placesCalls = [];
page.on('request', req => {
  if (req.url().includes('places.googleapis.com')) {
    placesCalls.push({ url: req.url(), method: req.method() });
  }
});

const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 100 });
await page.waitForTimeout(2000); // Wait for debounce + API response

console.log('Places API calls:', JSON.stringify(placesCalls, null, 2));

// Check if any suggestions appeared
const suggestionItems = await page.evaluate(() => {
  // Look for elements with the address search dropdown class
  const allDivs = Array.from(document.querySelectorAll('div'));
  // Find ones that look like address suggestions
  return allDivs
    .filter(d => {
      const style = d.getAttribute('style') || '';
      return style.includes('cursor: pointer') && 
             (d.textContent?.includes('道') || d.textContent?.includes('街') || d.textContent?.includes('路'));
    })
    .map(d => d.textContent?.substring(0, 80))
    .slice(0, 5);
});
console.log('Suggestions found:', suggestionItems);

// Check for API errors in console
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text().substring(0, 100));
});
await page.reload();
await page.waitForTimeout(3000);

await browser.close();
