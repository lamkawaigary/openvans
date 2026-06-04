import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') console.log('ERR:', msg.text().substring(0, 200));
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(3000);

// Click "填寫取件/送件地點 →" to open location sheet
const btn = await page.$('div:has-text("填寫取件/送件地點")');
if (btn) {
  await btn.click();
  await page.waitForTimeout(1000);
}

// Find the first text input and type
const inputs = await page.$$('input');
console.log('Inputs found:', inputs.length);

// Type in the first input
if (inputs.length > 0) {
  await inputs[0].click();
  await inputs[0].type('干諾道', { delay: 100 });
  await page.waitForTimeout(1000);
  
  // Check for suggestions
  const bodyText = await page.textContent('body');
  console.log('Suggestions on page:', bodyText.includes('干諾道中') || bodyText.includes('干諾道西'));
  
  // Check for any dropdown
  const allText = await page.textContent('body');
  console.log('All text after typing:', allText.substring(0, 500));
}

await browser.close();
