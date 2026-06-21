// driver-signin-monitor.cjs
// Auto-click Google sign-in button, then wait for user to complete Google flow.
// After sign-in, navigate to /driver-jobs and verify pending bookings are shown.

const { chromium } = require('playwright');

async function main() {
  console.log('🔌 Connecting to driver Chrome via CDP at localhost:9223...');
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

  if (!openvanPage) {
    console.log('❌ No OpenVan page found');
    process.exit(1);
  }

  console.log(`✅ Found page: ${openvanPage.url()}`);
  await openvanPage.bringToFront();

  // Wait for login page to be ready
  await openvanPage.waitForSelector('text=使用 Google 帳戶登入', { timeout: 10000 });
  console.log('✅ Login page loaded, Google button present');

  // Find and click the Google sign-in button
  // The button might be rendered as a div or via FedCM
  const googleButton = openvanPage.locator('text=使用 Google 帳戶登入').first();
  await googleButton.scrollIntoViewIfNeeded();
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-step1-login.png', fullPage: true });

  console.log('🖱  Clicking Google sign-in button...');
  await googleButton.click({ timeout: 5000 });

  // Wait for Google sign-in flow
  // Options:
  //   a) FedCM dialog appears (Chrome-level)
  //   b) New popup window with Google accounts
  //   c) Redirect to accounts.google.com
  console.log('');
  console.log('━'.repeat(60));
  console.log('⏸  STAGE 1: Google sign-in button clicked');
  console.log('━'.repeat(60));
  console.log('');
  console.log('👉 PLEASE NOW:');
  console.log('   1. Complete the Google sign-in in the popup / dialog');
  console.log('   2. Select garylkw1842@gmail.com (KW 1842 - driver account)');
  console.log('   3. Grant permissions if asked');
  console.log('');
  console.log('   This script will auto-detect when sign-in completes.');
  console.log('');

  // Monitor for state change — wait for URL to leave /login
  let polls = 0;
  const maxPolls = 60; // 3 minutes
  let lastUrl = openvanPage.url();
  while (polls < maxPolls) {
    await new Promise(r => setTimeout(r, 2000));
    const url = openvanPage.url();
    if (url !== lastUrl) {
      console.log(`[poll ${polls+1}] URL changed: ${lastUrl} → ${url}`);
      lastUrl = url;
    } else {
      console.log(`[poll ${polls+1}] url=${url}`);
    }

    if (!url.includes('/login')) {
      console.log(`✅ Sign-in completed! Now at: ${url}`);
      break;
    }
    polls++;
  }

  if (openvanPage.url().includes('/login')) {
    console.log('⚠️  Still at /login after 3 minutes. Sign-in may not have completed.');
    console.log('   Please check the browser window and try again.');
    await browser.close();
    process.exit(1);
  }

  // Wait for auth state to settle
  await openvanPage.waitForTimeout(3000);
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-step2-post-signin.png', fullPage: true });

  // === Navigate explicitly to /driver-jobs ===
  console.log('');
  console.log('━'.repeat(60));
  console.log('🧭 Hard refresh + navigate to /driver-jobs');
  console.log('━'.repeat(60));

  await openvanPage.goto('https://openvan.vercel.app/driver-jobs', { waitUntil: 'networkidle' });
  await openvanPage.waitForTimeout(4000); // Let Firestore subscribe fire + data load

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-step3-jobs.png', fullPage: true });
  const finalUrl = openvanPage.url();
  const bodyText = await openvanPage.locator('body').innerText().catch(() => '(could not read)');
  console.log(`📄 Final URL: ${finalUrl}`);
  console.log(`📄 Body text:`);
  console.log(bodyText.split('\n').map(l => '   ' + l).join('\n').substring(0, 2000));

  // Parse booking counts
  const matchCount = (bodyText.match(/可接訂單[^\d]*(\d+)/) || [])[1];
  const poolCount = (bodyText.match(/全城待接[^\d]*(\d+)/) || [])[1];
  console.log('');
  console.log('━'.repeat(60));
  console.log('🎯 RESULTS');
  console.log('━'.repeat(60));
  if (matchCount) console.log(`  ✅ 可接訂單 (match your vehicle type): ${matchCount}`);
  if (poolCount) console.log(`  📊 全城待接 (all pending): ${poolCount}`);
  if (!matchCount && !poolCount) {
    console.log('  ⚠️  No count labels found in body text.');
    console.log('     Check screenshot: /Users/gary/.openclaw/workspace/driver-step3-jobs.png');
  }

  await browser.close();
  console.log('');
  console.log('✅ Done. Screenshots:');
  console.log('   /Users/gary/.openclaw/workspace/driver-step1-login.png');
  console.log('   /Users/gary/.openclaw/workspace/driver-step2-post-signin.png');
  console.log('   /Users/gary/.openclaw/workspace/driver-step3-jobs.png');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
