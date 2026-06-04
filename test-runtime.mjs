import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  const text = msg.text();
  if (text.includes('Google Maps') || text.includes('error') || text.includes('Error') || text.includes('Suggest')) {
    console.log('CONSOLE:', msg.type(), text.substring(0, 300));
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

// Try clicking on 選擇上車地點 search bar
const searchBar = await page.$('div:has-text("選擇上車地點")');
if (searchBar) {
  console.log('Found search bar, clicking...');
  await searchBar.click();
  await page.waitForTimeout(1000);
}

// Now check if Step1Form is visible (should have 起始點)
const step1Visible = await page.evaluate(() => {
  const allDivs = document.querySelectorAll('div');
  for (const div of allDivs) {
    if (div.textContent && div.textContent.includes('起始點')) {
      return { found: true, parentText: div.parentElement?.textContent?.substring(0, 200) };
    }
  }
  return { found: false };
});
console.log('Step1 visible:', JSON.stringify(step1Visible));

// Check if there's a react element issue
const reactRoot = await page.evaluate(() => {
  const root = document.getElementById('root');
  if (root) {
    const children = root.querySelectorAll('*');
    return { childCount: children.length, firstChild: root.firstElementChild?.tagName };
  }
  return null;
});
console.log('React root:', JSON.stringify(reactRoot));

// Check what's at the bottom panel area
const panelContent = await page.evaluate(() => {
  const divs = document.querySelectorAll('div');
  const bottomDivs = [];
  divs.forEach(d => {
    const style = window.getComputedStyle(d);
    if (style.position === 'absolute' && style.bottom === '0px') {
      bottomDivs.push({ text: d.textContent?.substring(0, 100), tag: d.tagName });
    }
  });
  return bottomDivs.slice(0, 3);
});
console.log('Bottom panel divs:', JSON.stringify(panelContent, null, 2));

await browser.close();
