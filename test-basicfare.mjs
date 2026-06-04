import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(3000);
  
  // Open location sheet
  await page.click('text=填寫取件/送件地點 →');
  await page.waitForTimeout(500);

  // Type pickup
  const inp = await page.$('input[placeholder="起始點"]');
  await inp.click();
  await inp.type('干諾道中', { delay: 80 });
  await page.waitForTimeout(3500);

  // Click suggestion using evaluate with exact position
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const target = divs.find(d => d.textContent === '干諾道中香港' && d.style.cursor === 'pointer');
    if (target) target.click();
  });
  await page.waitForTimeout(4000);

  // Type dropoff
  const inputs = await page.$$('input');
  await inputs[1].click();
  await inputs[1].type('旺角', { delay: 80 });
  await page.waitForTimeout(3500);

  // Click dropoff suggestion using evaluate with exact position
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const target = divs.find(d => d.textContent === '香港旺角' && d.style.cursor === 'pointer');
    if (target) target.click();
  });
  await page.waitForTimeout(4000);

  // Check values
  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Input values:', vals);

  // Check fare on step2
  const nextBtn = await page.$('text=下一步');
  if (nextBtn && await nextBtn.isEnabled()) {
    await nextBtn.click();
    await page.waitForTimeout(2000);
    
    const bodyText = await page.textContent('body');
    const kmMatch = bodyText.match(/(\d+\.?\d*)\s*km/);
    const minMatch = bodyText.match(/(\d+)\s*分鐘/);
    const hkMatch = bodyText.match(/HK\$(\d+)/);
    console.log('Distance:', kmMatch?.[0], '| Time:', minMatch?.[0], '| Fare:', hkMatch?.[0]);
  }
  
} catch(e) {
  console.log('Error:', e.message);
} finally {
  await browser.close();
}
