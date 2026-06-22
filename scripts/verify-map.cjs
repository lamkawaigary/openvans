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
  
  // Capture errors during page load
  const errors = [];
  openvanPage.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  openvanPage.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  
  // Navigate to trip detail
  await openvanPage.goto('https://openvan.vercel.app/trips/9qfQP2q6M6HpizSjJDzA', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(5000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/trip-detail-with-map.png', fullPage: true });

  // Check map presence
  const mapExists = await openvanPage.locator('[data-testid="trip-map"]').isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Map container visible:', mapExists);

  // Check Google Map canvas
  const mapCanvas = await openvanPage.locator('canvas').count();
  console.log('Canvas elements (Google Maps renders into canvas):', mapCanvas);

  // Get all visible text + map-related info
  const body = await openvanPage.locator('body').innerText();
  console.log('\nBody text (first 1500):');
  console.log(body.split('\n').slice(0, 30).map(l => '  ' + l).join('\n'));

  // Check for Google Maps IFRAME / container info
  const mapContainers = await openvanPage.locator('[data-testid="trip-map"] iframe, [data-testid="trip-map"] .gm-style, [data-testid="trip-map"]').count();
  console.log('\nMap related elements found:', mapContainers);

  // Check if map has tiles loaded (Google Maps has <img> tiles)
  const tileCount = await openvanPage.locator('[data-testid="trip-map"] img').count();
  console.log('Map tile images loaded:', tileCount);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log('  ' + e.substring(0, 200)));
  } else {
    console.log('\n✅ 0 JS errors');
  }

  await browser.close();
})();
