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
  await openvanPage.waitForTimeout(6000);

  // Read debug attrs
  const debug = await openvanPage.evaluate(() => {
    const m = document.querySelector('[data-testid="trip-map"]');
    return {
      zoom: m?.getAttribute('data-zoom'),
      center: m?.getAttribute('data-center'),
      offsetW: m?.offsetWidth,
      offsetH: m?.offsetHeight,
    };
  });
  console.log('Map debug attrs:', JSON.stringify(debug, null, 2));

  // Capture console log
  const logs = [];
  openvanPage.on('console', msg => {
    if (msg.text().includes('TripDetailPage')) logs.push(msg.text());
  });
  await openvanPage.waitForTimeout(2000);
  console.log('\nConsole logs:', logs);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/trip-map-debug.png', fullPage: true });
  await browser.close();
})();
