import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.text().includes('select')) console.log(msg.text().substring(0, 100));
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(3000);
  console.log('Page loaded');
  
  // Open
  await page.click('text=填寫取件/送件地點 →');
  await page.waitForTimeout(300);
  console.log('Panel open');

  // Pickup
  const inp = await page.$('input[placeholder="起始點"]');
  await inp.click();
  await inp.type('干諾道中', { delay: 50 });
  await page.waitForTimeout(3000);
  console.log('Typed pickup');

  // Click pickup suggestion
  await page.click('div:has-text("干諾道中香港")');
  await page.waitForTimeout(4000);
  console.log('Clicked pickup');

  // Type dropoff
  const inputs = await page.$$('input');
  await inputs[1].click();
  await inputs[1].type('旺角', { delay: 50 });
  await page.waitForTimeout(3000);
  console.log('Typed dropoff');
  
  // Click dropoff suggestion - use more specific selector
  const旺角 = await page.$('div[style]:has-text("香港旺角")');
  if (旺角) {
    await旺角.click();
    console.log('Clicked dropoff via style selector');
    await page.waitForTimeout(4000);
  }

  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Final inputs:', vals);
  
} catch(e) {
  console.log('Error:', e.message);
} finally {
  await browser.close();
  console.log('Done');
}
