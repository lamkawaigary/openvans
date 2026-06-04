import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  if (msg.text().includes('selectPickup') || msg.text().includes('selectDropoff') || msg.text().includes('OpenVans') || msg.text().includes('coord')) {
    logs.push(msg.text());
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(800);

let inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(2000);

// Click suggestion
await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(2000);

inputs = await page.$$('input');
console.log('Pickup input value after click:', await inputs[0].inputValue());

await inputs[1].click();
await inputs[1].type('旺角', { delay: 80 });
await page.waitForTimeout(2000);

await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(2000);

inputs = await page.$$('input');
console.log('Dropoff input value after click:', await inputs[1].inputValue());

console.log('OpenVans logs:', logs);

await browser.close();
