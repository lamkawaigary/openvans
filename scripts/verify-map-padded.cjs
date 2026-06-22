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
  // Hard reload to get the new bundle
  await openvanPage.goto('https://openvan.vercel.app/trips/9qfQP2q6M6HpizSjJDzA', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(6000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/trip-map-padded.png', fullPage: true });

  const errors = [];
  openvanPage.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  await openvanPage.waitForTimeout(2000);

  // Verify dimensions
  const dims = await openvanPage.evaluate(() => {
    const m = document.querySelector('[data-testid="trip-map"]');
    if (!m) return { error: 'no map' };
    const r = m.getBoundingClientRect();
    return { w: r.width, h: r.height, ratio: (r.width / r.height).toFixed(2) };
  });
  console.log('Map dimensions:', dims);

  // Tile count (rough proxy for zoom level — more tiles at higher zoom)
  const tiles = await openvanPage.locator('[data-testid="trip-map"] img').count();
  console.log('Tile images:', tiles);

  // Marker count
  const markers = await openvanPage.locator('[data-testid="trip-map"] img[src*="marker"], [data-testid="trip-map"] canvas').count();
  console.log('Markers/canvas elements:', markers);

  console.log('\nErrors:', errors.length || 'none');
  errors.forEach(e => console.log('  ' + e.substring(0, 200)));

  await browser.close();
})();
