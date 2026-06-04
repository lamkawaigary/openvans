import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Click the fill button
const fillBtn = await page.$('div:has-text("填寫取件/送件地點")');
if (fillBtn) {
  await fillBtn.click();
  await page.waitForTimeout(1500);
}

// Get HTML of overlay areas
const overlayHtml = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  // Find divs with position:absolute and z-index >= 500
  const overlays = allDivs.filter(d => {
    const style = window.getComputedStyle(d);
    return style.position === 'absolute' && parseInt(style.zIndex) >= 500;
  });
  return overlays.map(d => ({
    text: d.textContent?.substring(0, 200),
    zIndex: d.style.zIndex || window.getComputedStyle(d).zIndex,
    html: d.outerHTML.substring(0, 400)
  }));
});
console.log('Overlay divs (z>=500):', JSON.stringify(overlayHtml, null, 2));

// Check specifically for the sheet with 起始點
const sheetHtml = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  for (const div of allDivs) {
    if (div.textContent?.includes('起始點') && div.textContent?.includes('下一步')) {
      return { found: true, html: div.outerHTML.substring(0, 500) };
    }
  }
  return { found: false };
});
console.log('Sheet with start point:', JSON.stringify(sheetHtml, null, 2));

// Also check for any element that has both 起始點 and 目的地
const routeSheet = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  for (const div of allDivs) {
    const text = div.textContent || '';
    if (text.includes('起始點') && text.includes('目的地') && text.length < 300) {
      return { found: true, html: div.outerHTML.substring(0, 500) };
    }
  }
  return { found: false };
});
console.log('Route sheet:', JSON.stringify(routeSheet, null, 2));

await browser.close();
