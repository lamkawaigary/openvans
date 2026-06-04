import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Get the full HTML and inspect the structure
const fullHtml = await page.content();

// Look for StepIndicator and Step1Form elements
const stepIndicatorHtml = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const step = allDivs.find(d => d.textContent?.includes('✓路線'));
  return step ? step.outerHTML.substring(0, 800) : null;
});
console.log('Step indicator HTML:', stepIndicatorHtml);

// Check panelWrap styles
const panelWrapStyle = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  for (const div of allDivs) {
    const style = window.getComputedStyle(div);
    // Check if this div contains the step indicator
    if (div.textContent?.includes('✓路線') && div.textContent?.includes('起始點') === false) {
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        overflow: style.overflow,
        height: style.height,
        maxHeight: style.maxHeight,
        zIndex: style.zIndex,
      };
    }
  }
  return null;
});
console.log('PanelWrap styles:', JSON.stringify(panelWrapStyle, null, 2));

// Check if there's a Step1Form div
const step1Html = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  for (const div of allDivs) {
    if (div.textContent?.trim() === '預覽路線 →') {
      return { found: true, html: div.outerHTML.substring(0, 300) };
    }
  }
  return { found: false };
});
console.log('Preview button:', JSON.stringify(step1Html, null, 2));

await browser.close();
