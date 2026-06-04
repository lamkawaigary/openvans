import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text().substring(0, 150));
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(800);

// Type pickup
let inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(2000);

// Get all API calls made
const apiCalls = [];
page.on('request', req => {
  if (req.url().includes('places.googleapis.com') || req.url().includes('firestore')) {
    apiCalls.push({ url: req.url().substring(0, 100), method: req.method() });
  }
});

// Click suggestion
await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(1500);

console.log('API calls after pickup select:', apiCalls.length);

// Type dropoff
inputs = await page.$$('input');
await inputs[1].click();
await inputs[1].type('旺角', { delay: 80 });
await page.waitForTimeout(2000);

// Click suggestion
await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(1500);

console.log('Total API calls:', apiCalls.length);

// Click 下一步
const nextBtn = page.getByText('下一步');
if (await nextBtn.count() > 0) {
  await nextBtn.click();
  await page.waitForTimeout(2000);
  
  // Try to find what was calculated
  const pageText = await page.textContent('body');
  
  // Get the distance and time displayed
  const distanceMatch = pageText.match(/\d+\.?\d*\s*km/);
  const timeMatch = pageText.match(/\d+\s*分鐘/);
  const hkMatch = pageText.match(/HK\$\d+/);
  
  console.log('Distance displayed:', distanceMatch);
  console.log('Time displayed:', timeMatch);
  console.log('HK$ amount:', hkMatch);
  
  // Get the full fare breakdown if any
  const allText = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    return divs
      .filter(d => d.textContent?.includes('起步價'))
      .map(d => d.textContent)
      .join('\n---break---\n');
  });
  console.log('Fare breakdown div:', allText.substring(0, 500));
}

console.log('Console errors:', errors.map(e => e.substring(0, 100)));

await browser.close();
