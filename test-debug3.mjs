import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  if (msg.text().includes('getPlaceCoords') || msg.text().includes('selectPickup') || msg.text().includes('selectDropoff')) {
    logs.push(msg.text());
  }
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  // Open panelFlow step1
  await page.click('text=填寫取件/送件地點 →');
  await page.waitForTimeout(500);

  // Type pickup
  const inputs = await page.$$('input');
  await inputs[0].click();
  await inputs[0].type('干諾道中', { delay: 60 });
  await page.waitForTimeout(3000);

  // Click suggestion
  await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
    if (suggs.length > 0) suggs[0].click();
  });
  await page.waitForTimeout(3000);

  // Type dropoff
  const inputs2 = await page.$$('input');
  await inputs2[1].click();
  await inputs2[1].type('旺角', { delay: 60 });
  await page.waitForTimeout(3000);

  // Click suggestion
  await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const suggs = allDivs.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
    if (suggs.length > 0) suggs[0].click();
  });
  await page.waitForTimeout(3000);

  console.log('Console logs:');
  logs.forEach(l => console.log(l));

  // Check inputs
  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Input values:', vals);

} finally {
  await browser.close();
}
