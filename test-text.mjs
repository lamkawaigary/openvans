import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Get all text content to understand what's actually rendered
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('=== BODY TEXT ===');
console.log(bodyText.substring(0, 2000));
console.log('=================');

// Check if the panel is there
const panelText = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  // Find divs that have the step indicator text
  const stepDivs = allDivs.filter(d => d.textContent?.includes('路線') || d.textContent?.includes('備注'));
  return stepDivs.map(d => d.textContent?.substring(0, 100));
});
console.log('Step indicator divs:', panelText);

// Check style of panel wrapping elements
const absDivs = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  return allDivs
    .filter(d => {
      const s = window.getComputedStyle(d);
      return s.display !== 'none' && s.visibility !== 'hidden' && d.textContent && d.textContent.trim().length > 0;
    })
    .slice(0, 20)
    .map(d => ({
      text: d.textContent?.substring(0, 80).replace(/\n/g, ' '),
      display: window.getComputedStyle(d).display,
      zIndex: window.getComputedStyle(d).zIndex,
    }));
});
console.log('Visible divs:', JSON.stringify(absDivs, null, 2));

await browser.close();
