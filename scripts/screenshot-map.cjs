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
  await openvanPage.goto('https://openvan.vercel.app/trips/9qfQP2q6M6HpizSjJDzA', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(8000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/trip-map-zoom8.png', fullPage: true });
  console.log('Screenshot saved to trip-map-zoom8.png');
  await browser.close();
})();
