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
  await openvanPage.waitForTimeout(6000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/order-hk-overview.png', fullPage: true });

  // Read map zoom via the data attribute (if we set one for the order map too — we didn't)
  // Just verify URL and tile count
  const tileCount = await openvanPage.locator('img').count();
  console.log('Image elements:', tileCount);

  // Try clicking 跨境車 service type and capture again
  console.log('\n--- Trying to click 跨境車 service type ---');
  // The service types are buttons in the bottom sheet
  // Find by text "跨境車"
  const crossBorderBtn = openvanPage.locator('text=/跨境/').first();
  if (await crossBorderBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Found 跨境車 button, clicking...');
    await crossBorderBtn.click();
    await openvanPage.waitForTimeout(3000);
    await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/order-prd-overview.png', fullPage: true });
    console.log('Captured PRD overview screenshot');
  } else {
    console.log('Cross-border button not found in current view');
  }

  await browser.close();
})();
