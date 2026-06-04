import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture ALL console messages
page.on('console', msg => {
  console.log(`[${msg.type()}] ${msg.text().substring(0, 300)}`);
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Check all errors only
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

// Check what's visible - look for inputs by checking the HTML
const html = await page.content();
const hasInputTag = html.includes('<input');
console.log('HTML has <input>:', hasInputTag);

// Check for the AddressSearchInput component render
const hasAddressSearch = html.includes('AddressSearchInput') || html.includes('起始點') || html.includes('目的地');
console.log('Has address search elements:', hasAddressSearch);

// Check the structure around "🔍選擇上車地點"
const searchAreaHtml = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const searchDiv = allDivs.find(d => d.textContent?.includes('🔍選擇上車地點'));
  if (searchDiv) {
    return {
      outerHTML: searchDiv.outerHTML.substring(0, 500),
      parentText: searchDiv.parentElement?.textContent?.substring(0, 200)
    };
  }
  return null;
});
console.log('Search area:', JSON.stringify(searchAreaHtml, null, 2));

await browser.close();
