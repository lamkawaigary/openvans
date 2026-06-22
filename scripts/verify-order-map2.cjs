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
  await openvanPage.goto('https://openvan.vercel.app/order', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(10000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/order-hk-overview.png', fullPage: true });

  // Check URL
  console.log('URL:', openvanPage.url());

  // Get body text
  const body = await openvanPage.locator('body').innerText();
  console.log('Body text (first 800 chars):');
  console.log(body.substring(0, 800));

  // Count various map elements
  const canvas = await openvanPage.locator('canvas').count();
  const tiles = await openvanPage.locator('img').count();
  console.log(`\nCanvas: ${canvas}, Img: ${tiles}`);

  await browser.close();
})();
