import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Get ALL text nodes directly 
const allText = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text && text.length > 1 && text.length < 200) {
      textNodes.push(text);
    }
  }
  return textNodes.slice(0, 50);
});
console.log('Text nodes:', allText);

// Check if the panel content has the step indicator
const stepContent = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  // Look for step indicator specifically
  const stepDivs = allDivs.filter(d => d.textContent?.includes('✓路線'));
  if (stepDivs.length > 0) {
    return stepDivs.map(d => ({
      text: d.textContent?.substring(0, 200),
      display: window.getComputedStyle(d).display,
      childCount: d.children.length,
      html: d.outerHTML.substring(0, 400)
    }));
  }
  return [];
});
console.log('Step divs:', JSON.stringify(stepDivs, null, 2));

// Check what comes AFTER the step indicator
const afterStep = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const stepDivs = allDivs.filter(d => d.textContent?.includes('✓路線'));
  if (stepDivs.length > 0) {
    const stepDiv = stepDivs[0];
    const children = Array.from(stepDiv.children);
    return children.map(c => ({
      tag: c.tagName,
      text: c.textContent?.substring(0, 100),
      html: c.outerHTML.substring(0, 200)
    }));
  }
  return [];
});
console.log('Children of step indicator:', JSON.stringify(afterStep, null, 2));

await browser.close();
