import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text().substring(0, 150)}`));

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(5000);

await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(1000);

const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 100 });
await page.waitForTimeout(4000);

await page.click('div:has-text("干諾道中香港")');
await page.waitForTimeout(4000);

const vals1 = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('After pickup:', vals1);

const inputs = await page.$$('input');
await inputs[1].click();
await inputs[1].type('旺角', { delay: 100 });
await page.waitForTimeout(4000);

await page.click('div:has-text("香港旺角")');
await page.waitForTimeout(4000);

const vals2 = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('After dropoff:', vals2);

await browser.close();
console.log('Done');
