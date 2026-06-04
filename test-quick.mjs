import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  if (msg.text().includes('OpenVans')) logs.push(msg.text().substring(0, 200));
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'networkidle', timeout: 12000 });
  await page.waitForTimeout(3000);

  // Click the button
  await page.click('text=填寫取件/送件地點 →', { timeout: 3000 });
  await page.waitForTimeout(500);

  // Type in first input
  await page.click('input[placeholder="起始點"]', { timeout: 3000 });
  await page.type('input[placeholder="起始點"]', '干諾道中', { delay: 50 });
  await page.waitForTimeout(2500);

  // Click suggestion
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const target = divs.find(d => d.textContent === '干諾道中');
    if (target) target.click();
  });
  await page.waitForTimeout(2500);

  // Type dropoff
  await page.click('input[placeholder="目的地"]', { timeout: 3000 });
  await page.type('input[placeholder="目的地"]', '旺角', { delay: 50 });
  await page.waitForTimeout(2500);

  // Click suggestion
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const target = divs.find(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
    if (target) target.click();
  });
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
