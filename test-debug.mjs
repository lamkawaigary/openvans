import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Click fill button
const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1000);

const inputs = await page.$$('input');
console.log('Inputs found:', inputs.length);

if (inputs.length >= 2) {
  // Type pickup
  await inputs[0].click();
  await inputs[0].type('干諾道中', { delay: 100 });
  await page.waitForTimeout(1500);
  
  // Get all text after typing
  const body = await page.textContent('body');
  console.log('Has 干諾道中 in body:', body.includes('干諾道中'));
  
  // Check if suggestions appeared
  const suggestionTexts = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    return divs
      .filter(d => d.textContent?.includes('干諾道'))
      .map(d => d.textContent?.substring(0, 100));
  });
  console.log('Suggestion divs:', suggestionTexts.slice(0, 3));
  
  // Click first suggestion (the one with formatted text)
  const clickable = await page.$$('div[style*="cursor: pointer"]');
  console.log('Clickable divs:', clickable.length);
  
  if (clickable.length > 0) {
    await clickable[0].click();
    await page.waitForTimeout(1000);
  }
  
  // Type dropoff  
  await inputs[1].click();
  await inputs[1].type('旺角', { delay: 100 });
  await page.waitForTimeout(1500);
  
  const clickable2 = await page.$$('div[style*="cursor: pointer"]');
  console.log('Clickable divs after dropoff:', clickable2.length);
  
  if (clickable2.length > 0) {
    await clickable2[0].click();
    await page.waitForTimeout(1000);
  }
  
  // Now click "下一步" if available
  const nextBtn = page.getByText('下一步');
  if (await nextBtn.count() > 0) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
    
    // Check fare breakdown
    const bodyText = await page.textContent('body');
    console.log('Step 2 body contains km:', bodyText.includes('km'));
    console.log('Step 2 body contains HK$:', bodyText.includes('HK$'));
    
    // Get all numbers that look like distance/time
    const numbers = bodyText.match(/\d+\.?\d*(?:km|分鐘|mins?|分)/gi);
    console.log('Distance/time mentions:', numbers);
    
    // Get fare breakdown
    const breakdown = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const fareDiv = divs.find(d => d.textContent?.includes('估計總費'));
      return fareDiv ? fareDiv.textContent?.substring(0, 500) : null;
    });
    console.log('Fare breakdown:', breakdown);
  }
}

await browser.close();
