import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Click fill button
const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1000);

// Type in pickup and dropoff
const inputs = await page.$$('input');
if (inputs.length >= 2) {
  await inputs[0].click();
  await inputs[0].type('干諾道中', { delay: 100 });
  await page.waitForTimeout(1500);
  
  // Click first suggestion if any
  const suggs = await page.$$('div[style*="cursor: pointer"]');
  if (suggs.length > 0) {
    await suggs[0].click();
    await page.waitForTimeout(500);
  }
  
  await inputs[1].click();
  await inputs[1].type('旺角', { delay: 100 });
  await page.waitForTimeout(1500);
  
  const suggs2 = await page.$$('div[style*="cursor: pointer"]');
  if (suggs2.length > 0) {
    await suggs2[0].click();
    await page.waitForTimeout(500);
  }
  
  // Check the fare display
  const fareText = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const fareDiv = allDivs.find(d => d.textContent?.includes('估計總費'));
    return fareDiv ? fareDiv.textContent?.substring(0, 300) : 'not found';
  });
  console.log('Fare display:', fareText);
  
  // Get the calculation
  const fareCalc = await page.evaluate(async () => {
    // Try to find the calculation
    const allDivs = Array.from(document.querySelectorAll('div'));
    const breakdown = allDivs.filter(d => {
      const t = d.textContent || '';
      return t.includes('起步價') && t.includes('里程費');
    });
    return breakdown.map(d => d.textContent?.substring(0, 200));
  });
  console.log('Breakdown:', JSON.stringify(fareCalc, null, 2));
}

await browser.close();
