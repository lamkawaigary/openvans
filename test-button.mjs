import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Try clicking by text using page.locator
const btn = page.getByText('填寫取件/送件地點 →');
const count = await btn.count();
console.log('Button count:', count);

if (count > 0) {
  console.log('Clicking button...');
  await btn.click();
  await page.waitForTimeout(1000);
  
  // Check body text for sheet content
  const bodyText = await page.textContent('body');
  console.log('Has 起始點:', bodyText.includes('起始點'));
  console.log('Has 下一步:', bodyText.includes('下一步'));
  console.log('Has 目的地:', bodyText.includes('目的地'));
  
  // Check for any button in the page
  const allBtns = await page.$$('button');
  console.log('Total buttons:', allBtns.length);
  for (const b of allBtns) {
    const text = await b.textContent();
    console.log('  button:', text?.substring(0, 50));
  }
  
  // Also check if the React state changed by looking for different UI elements
  const hasSheet = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    return allDivs.some(d => {
      const text = d.textContent || '';
      return text.includes('起始點') && text.includes('下一步') && text.length < 500;
    });
  });
  console.log('Has LocationSheet:', hasSheet);
}

await browser.close();
