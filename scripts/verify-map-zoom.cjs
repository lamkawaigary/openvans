// verify-map-zoom.cjs
// Verify map uses setCenter(midpoint) + dynamic zoom (not fitBounds)
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
  await openvanPage.waitForTimeout(5000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/trip-map-zoomed.png', fullPage: true });

  // Try to extract map center + zoom via runtime evaluation
  const mapState = await openvanPage.evaluate(() => {
    // Google Maps doesn't expose state directly to window, but we can look at the iframe contents
    // or check marker positions on the rendered tiles
    const mapDiv = document.querySelector('[data-testid="trip-map"]');
    if (!mapDiv) return { error: 'no map div' };
    const rect = mapDiv.getBoundingClientRect();
    return {
      mapWidth: rect.width,
      mapHeight: rect.height,
      aspectRatio: (rect.width / rect.height).toFixed(2),
    };
  });
  console.log('Map dimensions:', mapState);

  // Check map tile images (should reflect zoom level)
  const tileCount = await openvanPage.locator('[data-testid="trip-map"] img').count();
  console.log('Map tile images:', tileCount);

  // Get body text
  const body = await openvanPage.locator('body').innerText();
  console.log('\nBody text:');
  console.log(body.split('\n').slice(0, 12).map(l => '  ' + l).join('\n').substring(0, 800));

  // Try to read Google Maps iframe content (might be CORS-protected but we can check via getAttribute)
  const iframe = openvanPage.locator('[data-testid="trip-map"] iframe');
  const iframeCount = await iframe.count();
  console.log('Map iframe count:', iframeCount);

  await browser.close();
})();
