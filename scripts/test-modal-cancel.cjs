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

  // Modal should already be open from previous test
  // Click 取消
  const cancelBtn = openvanPage.locator('[data-testid="accept-cancel-btn"]');
  console.log('取消 button visible:', await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false));

  if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Clicking 取消...');
    await cancelBtn.click();
    await openvanPage.waitForTimeout(1500);
  }

  // Check modal closed
  const modalVisible = await openvanPage.locator('[data-testid="accept-confirm-modal"]').isVisible({ timeout: 1000 }).catch(() => false);
  console.log('Modal visible after cancel:', modalVisible);

  // Take screenshot
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-after-cancel.png', fullPage: true });

  // Check counts — should still show 1 light (booking not accepted)
  const body = await openvanPage.locator('body').innerText();
  const matchCount = (body.match(/可接訂單[^\d]*(\d+)/) || [])[1];
  const poolCount = (body.match(/全城待接[^\d]*(\d+)/) || [])[1];
  console.log(`After cancel: 可接訂單=${matchCount}, 全城待接=${poolCount}`);

  // Verify no "已接單" toast
  const hasAcceptToast = body.includes('已接單') || body.includes('已接單！');
  console.log(`No "已接單" toast: ${!hasAcceptToast}`);

  // Backend verify
  console.log('\n--- Backend verify ---');
  const { execSync } = require('child_process');
  const TOKEN = execSync("firebase login:list --json 2>&1 | jq -r '.result[0].tokens.access_token'").toString().trim();
  const PROJECT="opensystem-857b2";
  const resp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'bookings' }] } })
  }).then(r => r.json());
  const stillPending = (resp || []).filter(d => d.document?.fields?.status?.stringValue === 'pending').length;
  const confirmed = (resp || []).filter(d => d.document?.fields?.status?.stringValue === 'confirmed').length;
  console.log(`Pending: ${stillPending}, Confirmed: ${confirmed}`);

  await browser.close();
})();
