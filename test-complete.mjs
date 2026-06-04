import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text().substring(0, 200));
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
await page.waitForTimeout(1800);

await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(1200);

// Type dropoff
inputs = await page.$$('input');
await inputs[1].click();
await inputs[1].type('旺角', { delay: 80 });
await page.waitForTimeout(1800);

await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(1200);

// Click 下一步
const nextBtn = page.getByText('下一步');
if (await nextBtn.count() > 0) {
  await nextBtn.click();
  await page.waitForTimeout(2000);
  
  // Get fare breakdown
  const bodyText = await page.textContent('body');
  console.log('Has km:', bodyText.includes('km'));
  console.log('Has HK$:', bodyText.includes('HK$'));
  
  // Find any breakdown details
  const fareDivs = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    return divs
      .filter(d => d.textContent?.includes('里程費') || d.textContent?.includes('起步價'))
      .map(d => d.textContent?.substring(0, 200));
  });
  console.log('Fare rows:', fareDivs);
  
  // Check if there's any distance display
  const kmText = bodyText.match(/\d+\.?\d*\s*km/);
  console.log('Distance displayed:', kmText);
} else {
  console.log('Next button not found');
}

console.log('Errors:', errors);
await browser.close();
