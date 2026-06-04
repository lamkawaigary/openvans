import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console errors only
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1000);

// Type pickup
const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 100 });
await page.waitForTimeout(2000);

// Click the first suggestion
const clicked = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => 
    d.textContent === '干諾道中香港'
  );
  if (suggs.length > 0) {
    suggs[0].click();
    return true;
  }
  return false;
});
console.log('Clicked suggestion:', clicked);
await page.waitForTimeout(2000);

// Check if input now has value
const inputVal = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input'));
  return inputs.map(i => i.value);
});
console.log('Input values after click:', inputVal);

// Type dropoff
const inputs2 = await page.$$('input');
await inputs2[1].click();
await inputs2[1].type('旺角', { delay: 100 });
await page.waitForTimeout(2000);

// Click suggestion
const clicked2 = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => 
    d.textContent?.includes('旺角') || d.textContent?.includes('Mong Kok')
  );
  console.log('Found旺角 divs:', suggs.map(d => d.textContent));
  if (suggs.length > 0) {
    suggs[0].click();
    return true;
  }
  return false;
});
console.log('Clicked2:', clicked2);
await page.waitForTimeout(2000);

const inputVal2 = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input'));
  return inputs.map(i => i.value);
});
console.log('Input values after click2:', inputVal2);

// Check console errors
console.log('Console errors:', errors.map(e => e.substring(0, 100)));

await browser.close();
