import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  if (msg.text().includes('OpenVans')) logs.push(msg.text().substring(0, 200));
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  // Click the button
  const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(500);

  // Type pickup
  const pickupInput = await page.waitForSelector('input[placeholder="起始點"]', { timeout: 5000 });
  await pickupInput.click();
  await pickupInput.type('干諾道中', { delay: 60 });
  await page.waitForTimeout(2500);

  // Click the suggestion
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const target = divs.find(d => d.textContent === '干諾道中');
    if (target) target.click();
    else console.log('Not found, all divs:', divs.map(d => d.textContent).filter(t => t.includes('道')));
  });
  await page.waitForTimeout(2500);

  // Type dropoff
  const dropInput = await page.waitForSelector('input[placeholder="目的地"]', { timeout: 5000 });
  await dropInput.click();
  await dropInput.type('旺角', { delay: 60 });
  await page.waitForTimeout(2500);

  // Get input values  
  const vals = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(i => i.value);
  });
  console.log('Input values:', vals);
  console.log('Logs:', logs);
} finally {
  await browser.close();
}
