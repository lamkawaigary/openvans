// verify-sidemenu.cjs — Open side menu and check driver links
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223');
  let openvanPage = null;
  for (const ctx of browser.contexts()) {
    for (const page of ctx.pages()) {
      if (page.url().includes('openvan.vercel.app')) {
        openvanPage = page;
        break;
      }
    }
    if (openvanPage) break;
  }
  if (!openvanPage) { console.log('No page'); process.exit(1); }

  await openvanPage.bringToFront();
  // Make sure we're on driver-jobs
  await openvanPage.goto('https://openvan.vercel.app/driver-jobs', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(2000);

  // Click hamburger menu (top left)
  const menuBtn = openvanPage.locator('button').first();
  await menuBtn.click();
  await openvanPage.waitForTimeout(1500);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/sidemenu-after.png', fullPage: true });

  // Get all link texts
  const links = await openvanPage.locator('a, [role="button"]').allInnerTexts();
  const body = await openvanPage.locator('body').innerText();
  console.log('Body text:');
  console.log(body.split('\n').map(l => '  ' + l).join('\n').substring(0, 2000));

  console.log('\n=== Driver section links ===');
  const driverItems = ['搶單', '我的車隊', '車輛Dashboard', '個人資料', '我的Van', '我的', '行程'];
  for (const item of driverItems) {
    const present = body.includes(item);
    console.log(`  ${present ? '❌ (still present)' : '✅ (absent)'} ${item}`);
  }

  await browser.close();
})();
