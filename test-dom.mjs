import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(3000);

// Check what type of elements the main content uses
const allElements = await page.evaluate(() => {
  const body = document.body;
  const inputs = body.querySelectorAll('input');
  const textareas = body.querySelectorAll('textarea');
  const contenteditable = body.querySelectorAll('[contenteditable]');
  const divs = body.querySelectorAll('div');
  
  return {
    inputs: inputs.length,
    inputPlaceholders: Array.from(inputs).map(i => i.placeholder),
    textareas: textareas.length,
    contenteditable: contenteditable.length,
    divs: divs.length,
  };
});
console.log('Elements:', JSON.stringify(allElements, null, 2));

// Check the full HTML structure around "起始點" text
const step1Html = await page.evaluate(() => {
  const allDivs = document.querySelectorAll('div');
  for (const div of allDivs) {
    if (div.textContent && div.textContent.includes('起始點') && div.textContent.length < 200) {
      return div.outerHTML.substring(0, 1000);
    }
  }
  return 'not found';
});
console.log('Step1 HTML:', step1Html);

await browser.close();
