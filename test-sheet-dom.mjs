import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Click the button
const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1500);

// Get detailed info about the sheet area
const sheetInfo = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const allInputs = Array.from(document.querySelectorAll('input'));
  const allButtons = Array.from(document.querySelectorAll('button'));
  
  return {
    inputCount: allInputs.length,
    inputDetails: allInputs.map(i => ({
      placeholder: i.placeholder,
      type: i.type,
      value: i.value,
      display: window.getComputedStyle(i).display,
      visibility: window.getComputedStyle(i).visibility,
    })),
    buttonTexts: allButtons.map(b => b.textContent?.trim()),
    // Find the sheet div (with z-index 500 and position absolute)
    sheetDiv: (() => {
      const sheets = allDivs.filter(d => {
        const style = window.getComputedStyle(d);
        return style.position === 'absolute' && parseInt(style.zIndex) >= 500;
      });
      return sheets.slice(0, 2).map(d => ({
        text: d.textContent?.substring(0, 200),
        html: d.outerHTML.substring(0, 600),
      }));
    })(),
  };
});
console.log('Sheet info:', JSON.stringify(sheetInfo, null, 2));

await browser.close();
