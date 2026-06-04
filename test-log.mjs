import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  if (msg.text().includes('AddressSearchInput') || msg.text().includes('Step1Form') || msg.text().includes('OpenVans') || msg.text().includes('getPlaceCoords')) {
    logs.push(msg.text());
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
await btn.click();
await page.waitForTimeout(500);

const inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 100 });
await page.waitForTimeout(3500);

console.log('After typing, logs:');
logs.forEach(l => console.log(l));
console.log('---');

await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  console.log('Found suggestions:', suggs.length);
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(4000);

console.log('\nAfter click, logs:');
logs.forEach(l => console.log(l));

console.log('\nTotal logs:', logs.length);

await browser.close();
