import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Look for all input elements by tag name
const inputs = await page.evaluate(() => {
  const allInputs = document.querySelectorAll('input');
  return Array.from(allInputs).map(i => ({
    type: i.type,
    placeholder: i.placeholder,
    value: i.value,
    parentText: i.parentElement?.textContent?.substring(0, 50),
  }));
});
console.log('All inputs:', JSON.stringify(inputs, null, 2));

// Check Step1Form specifically  
const step1Content = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  // Find div with "起始點" 
  for (const div of allDivs) {
    if (div.textContent?.trim() === '起始點') {
      return { 
        found: true,
        parentHTML: div.parentElement?.outerHTML?.substring(0, 500),
        grandparentText: div.parentElement?.parentElement?.textContent?.substring(0, 200)
      };
    }
  }
  return { found: false };
});
console.log('Step1 content:', JSON.stringify(step1Content, null, 2));

// Check the panelWrap display property
const panelDisplay = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const panelWraps = allDivs.filter(d => d.textContent?.includes('起始點'));
  return panelWraps.map(d => {
    const style = window.getComputedStyle(d);
    return { display: style.display, visibility: style.visibility, opacity: style.opacity };
  });
});
console.log('PanelWrap display:', JSON.stringify(panelDisplay, null, 2));

// Try scrolling to bottom and check
const bottomContent = await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
  return document.body.innerText.substring(0, 500);
});
console.log('Bottom content after scroll:', bottomContent);

await browser.close();
