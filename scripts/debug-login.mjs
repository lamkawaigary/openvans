import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text().substring(0, 250)));
page.on('pageerror', (err) => console.log('[pageerror]', err.message.substring(0, 250)));

await page.goto('https://openvan.vercel.app/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// Fill + click
await page.locator('input[type="email"]').first().fill('e2e-renter@openvans-test.hk');
await page.locator('input[type="password"]').first().fill('E2ETest123!');
await page.waitForTimeout(500);

// Click submit + wait + capture
console.log('Clicking submit...');
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(6000);
console.log('URL:', page.url());
const errEl = await page.locator('text=/錯誤|error|失敗|invalid/i').first().textContent().catch(() => null);
console.log('error message:', errEl);

// Check current state of email field
const emailVal = await page.locator('input[type="email"]').first().inputValue().catch(() => '');
console.log('email field:', emailVal);

await page.waitForTimeout(60000);
await browser.close();
