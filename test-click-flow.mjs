import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1000);

// Find and click "干諾道中" suggestion
const clickResult = await page.evaluate(async () => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  // Find suggestion divs that contain "干諾道"
  const suggDivs = allDivs.filter(d => {
    return d.textContent === '干諾道中香港';
  });
  console.log('Found suggestion divs:', suggDivs.length);
  
  if (suggDivs.length > 0) {
    // Check parent for style
    const parent = suggDivs[0].parentElement;
    console.log('Parent tag:', parent?.tagName, 'Parent text:', parent?.textContent?.substring(0, 100));
    
    // Simulate click
    suggDivs[0].click();
    return 'clicked';
  }
  return 'not found';
});
console.log('Click result:', clickResult);

await page.waitForTimeout(1000);

// Check state after click
const state = await page.evaluate(() => {
  // Get all inputs and their values
  const inputs = Array.from(document.querySelectorAll('input'));
  return inputs.map(i => ({ value: i.value, placeholder: i.placeholder }));
});
console.log('Input state:', JSON.stringify(state, null, 2));

await browser.close();
