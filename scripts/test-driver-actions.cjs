// test-driver-actions.cjs
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
  // Hard reload to get new bundle
  await openvanPage.goto('https://openvan.vercel.app/driver-jobs', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(3000);

  // First, accept a new booking via /driver-jobs (the IFC → Kau Wa Keng one)
  const acceptBtn = openvanPage.locator('button:has-text("接單")').first();
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking first 接單...');
    await acceptBtn.click();
    await openvanPage.waitForTimeout(1500);

    // Click 確認接單 in modal
    const confirmBtn = openvanPage.locator('[data-testid="accept-confirm-btn"]');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking 確認接單...');
      await confirmBtn.click();
      await openvanPage.waitForTimeout(2500);
    }
  }

  // Now go to /trips
  console.log('\n=== Navigate to /trips ===');
  await openvanPage.goto('https://openvan.vercel.app/trips', { waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(3000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-trips-list.png', fullPage: true });
  const tripsBody = await openvanPage.locator('body').innerText();
  console.log('/trips body:');
  console.log(tripsBody.split('\n').slice(0, 30).map(l => '  ' + l).join('\n').substring(0, 1500));

  // Click first trip card
  const firstCard = openvanPage.locator('text=/HK\\$/').first();
  if (await firstCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('\nClicking first trip card...');
    await firstCard.click();
    await openvanPage.waitForTimeout(3000);
  }

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-trip-detail.png', fullPage: true });
  const detailUrl = openvanPage.url();
  const detailBody = await openvanPage.locator('body').innerText();
  console.log('\n=== Trip detail page ===');
  console.log('URL:', detailUrl);
  console.log('Body:');
  console.log(detailBody.split('\n').slice(0, 50).map(l => '  ' + l).join('\n').substring(0, 2500));

  // Check for 開始送貨 / 完成訂單 buttons
  const hasStartBtn = await openvanPage.locator('[data-testid="driver-start-btn"]').isVisible({ timeout: 2000 }).catch(() => false);
  const hasCompleteBtn = await openvanPage.locator('[data-testid="driver-complete-btn"]').isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`\n🚚 開始送貨 button visible: ${hasStartBtn}`);
  console.log(`✅ 完成訂單 button visible: ${hasCompleteBtn}`);

  // If confirmed status, click 開始送貨
  if (hasStartBtn) {
    console.log('\n=== Clicking 開始送貨 ===');
    await openvanPage.locator('[data-testid="driver-start-btn"]').click();
    await openvanPage.waitForTimeout(3000);

    await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-after-start.png', fullPage: true });
    const afterStartBody = await openvanPage.locator('body').innerText();
    console.log('After 開始送貨 body:');
    console.log(afterStartBody.split('\n').slice(0, 50).map(l => '  ' + l).join('\n').substring(0, 1500));

    const hasCompleteBtnNow = await openvanPage.locator('[data-testid="driver-complete-btn"]').isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`\n✅ 完成訂單 button now visible: ${hasCompleteBtnNow}`);
  }

  await browser.close();
})();
