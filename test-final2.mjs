import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  if (msg.text().includes('select')) console.log(msg.text().substring(0, 100));
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(3000);
  
  await page.click('text=填寫取件/送件地點 →');
  await page.waitForTimeout(300);

  const inp = await page.$('input[placeholder="起始點"]');
  await inp.click();
  await inp.type('干諾道中', { delay: 50 });
  await page.waitForTimeout(3000);

  await page.click('div:has-text("干諾道中香港")');
  await page.waitForTimeout(4000);

  const inputs = await page.$$('input');
  await inputs[1].click();
  await inputs[1].type('旺角', { delay: 50 });
  await page.waitForTimeout(3000);
  
  // Click using text
  await page.click('text=香港旺角');
  await page.waitForTimeout(4000);

  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Final inputs:', vals);
  
} catch(e) {
  console.log('Error:', e.message);
} finally {
  await browser.close();
}
