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

  // Hard reload to get new bundle
  console.log('Hard reload to get new bundle...');
  await openvanPage.reload({ waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(4000);

  // Click first "接單" button
  const acceptBtn = openvanPage.locator('button:has-text("接單")').first();
  if (!(await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    console.log('❌ No 接單 button visible');
    await browser.close();
    process.exit(1);
  }

  console.log('Clicking first 接單 button...');
  await acceptBtn.click();
  await openvanPage.waitForTimeout(1500);

  // Take screenshot of modal
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-confirm-modal.png', fullPage: true });

  // Check modal presence
  const modal = openvanPage.locator('[data-testid="accept-confirm-modal"]');
  const isVisible = await modal.isVisible().catch(() => false);
  console.log('Modal visible:', isVisible);

  if (isVisible) {
    const body = await openvanPage.locator('body').innerText();
    console.log('Modal body text:');
    console.log(body.split('\n').map(l => '  ' + l).join('\n').substring(0, 2000));
  } else {
    console.log('Modal not shown — checking page state');
    const body = await openvanPage.locator('body').innerText();
    console.log('Body text:');
    console.log(body.split('\n').map(l => '  ' + l).join('\n').substring(0, 1000));
  }

  await browser.close();
})();
