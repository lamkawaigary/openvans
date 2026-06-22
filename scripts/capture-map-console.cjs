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

  // Listen to console BEFORE navigation
  const logs = [];
  openvanPage.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  openvanPage.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));

  // Force fresh load
  await openvanPage.goto('https://openvan.vercel.app/trips/9qfQP2q6M6HpizSjJDzA', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(8000);

  const debug = await openvanPage.evaluate(() => {
    const m = document.querySelector('[data-testid="trip-map"]');
    return {
      zoom: m?.getAttribute('data-zoom'),
      center: m?.getAttribute('data-center'),
    };
  });
  console.log('Debug attrs:', debug);
  console.log('\nConsole logs (' + logs.length + '):');
  logs.forEach(l => console.log('  ' + l.substring(0, 300)));

  await browser.close();
})();
