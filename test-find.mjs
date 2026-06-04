import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Find any div with "填寫" in it
const findResult = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const matching = allDivs.filter(d => d.textContent?.includes('填寫'));
  return matching.slice(0, 5).map(d => ({
    text: d.textContent?.substring(0, 100),
    html: d.outerHTML.substring(0, 300),
    style: {
      display: window.getComputedStyle(d).display,
      visibility: window.getComputedStyle(d).visibility,
    }
  }));
});
console.log('Divs with 填寫:', JSON.stringify(findResult, null, 2));

// Check the full body text for any elements containing the arrow character
const allTextNodes = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent?.includes('→')) {
      nodes.push({ text: node.textContent, parent: node.parentElement?.tagName });
    }
  }
  return nodes;
});
console.log('Nodes with →:', JSON.stringify(allTextNodes, null, 2));

await browser.close();
