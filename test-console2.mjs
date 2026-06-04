import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  logs.push(`[${msg.type()}] ${msg.text().substring(0, 150)}`);
});

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(4000);

const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(800);

let inputs = await page.$$('input');
await inputs[0].click();
await inputs[0].type('干諾道中', { delay: 80 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(2500);

inputs = await page.$$('input');
console.log('After pickup click, value:', await inputs[0].inputValue());

await inputs[1].click();
await inputs[1].type('旺角', { delay: 80 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  const suggs = allDivs.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
  if (suggs.length > 0) suggs[0].click();
});
await page.waitForTimeout(2500);

inputs = await page.$$('input');
console.log('After dropoff click, value:', await inputs[1].inputValue());

// Show logs
console.log('\nAll relevant logs:');
logs.filter(l => l.includes('OpenVans') || l.includes('select')).forEach(l => console.log(l));

await browser.close();
