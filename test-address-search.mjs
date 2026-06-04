import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log('LOG:', msg.text().substring(0, 200)));

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(3000);

// Click the fill location button to open the sheet
const btn = await page.$('div:has-text("填寫取件/送件地點")');
if (btn) {
  await btn.click();
  await page.waitForTimeout(1000);
}

// Now check all elements in the sheet
const allSpans = await page.$$('span');
console.log('Total spans:', allSpans.length);

// Check the LocationSheet content
const sheetBody = await page.evaluate(() => {
  // Get all text in the body
  return document.body.innerText.substring(0, 1000);
});
console.log('Sheet content:', sheetBody);

// Look specifically for input-like elements
const editableDivs = await page.$$('[contenteditable]');
console.log('contenteditable divs:', editableDivs.length);

// Check what's in the overlay divs
const overlays = await page.$$('div[style*="position: absolute"]');
console.log('Absolute overlays:', overlays.length);

for (const ov of overlays.slice(0, 5)) {
  const style = await ov.getAttribute('style');
  const text = await ov.textContent();
  console.log(`  Overlay: style="${style?.substring(0, 100)}" text="${text?.substring(0, 50)}"`);
}

await browser.close();
