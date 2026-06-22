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
  await openvanPage.goto('https://openvan.vercel.app/driver-jobs', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(5000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-my-bookings.png', fullPage: true });

  // Verify the link element
  const linkVisible = await openvanPage.locator('[data-testid="my-bookings-link"]').isVisible({ timeout: 2000 }).catch(() => false);
  console.log('我的訂單 link visible:', linkVisible);

  if (linkVisible) {
    const text = await openvanPage.locator('[data-testid="my-bookings-link"]').innerText();
    console.log('Card text:', text.replace(/\n/g, ' | '));

    // Click it
    await openvanPage.locator('[data-testid="my-bookings-link"]').click();
    await openvanPage.waitForTimeout(3000);

    console.log('\nAfter click, URL:', openvanPage.url());
    await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-my-bookings-after-click.png', fullPage: true });
  }

  await browser.close();
})();
