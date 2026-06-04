import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// First, click the search bar to see what happens
const searchBar = await page.$('div:has-text("選擇上車地點")');
if (searchBar) {
  console.log('--- Clicking search bar ---');
  await searchBar.click();
  await page.waitForTimeout(1000);
  
  // Check what's on the page now
  const afterClick = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 1 && text.length < 200) {
        textNodes.push(text);
      }
    }
    return textNodes.slice(0, 60);
  });
  console.log('After click:', afterClick);
}

// Now click the "填寫取件/送件地點 →" button  
const fillBtn = await page.$('div:has-text("填寫取件/送件地點")');
if (fillBtn) {
  console.log('--- Clicking fill button ---');
  await fillBtn.click();
  await page.waitForTimeout(1000);
  
  const afterFill = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 1 && text.length < 200) {
        textNodes.push(text);
      }
    }
    return textNodes.slice(0, 60);
  });
  console.log('After fill button:', afterFill);
  
  // Check for any input elements
  const inputs = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input');
    return Array.from(allInputs).map(i => ({
      placeholder: i.placeholder,
      type: i.type,
    }));
  });
  console.log('Inputs after fill:', inputs);
}

await browser.close();
