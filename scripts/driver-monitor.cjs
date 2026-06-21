// driver-monitor.cjs
// Non-blocking monitor of driver Chrome via CDP. Polls state, takes screenshots,
// and reports driver-side UI state to terminal + screenshots.

const { chromium } = require('playwright');

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 30; // ~90 seconds

async function main() {
  console.log('🔌 Connecting to driver Chrome via CDP at localhost:9223...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9223');
  } catch (e) {
    console.error('❌ Failed to connect:', e.message);
    console.log('💡 Make sure driver Chrome is running with --remote-debugging-port=9223');
    process.exit(1);
  }

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
  console.log(`📸 Initial screenshot saved`);
  await openvanPage.bringToFront().catch(() => {});
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-monitor-1.png', fullPage: true });

  // Monitor loop
  for (let i = 0; i < MAX_POLLS; i++) {
    const url = openvanPage.url();
    const title = await openvanPage.title().catch(() => '?');
    let bodyText = '';
    try {
      bodyText = await openvanPage.locator('body').innerText({ timeout: 2000 });
    } catch (e) {
      bodyText = '(could not read)';
    }
    const bodyPreview = bodyText.substring(0, 300).replace(/\n/g, ' | ');

    console.log(`[poll ${i+1}/${MAX_POLLS}] url=${url}`);
    console.log(`  title=${title}`);
    console.log(`  body: ${bodyPreview}`);

    // Detect state transitions
    if (url.includes('/login')) {
      console.log(`  ⏸  STAGE 1: At /login — waiting for sign-in`);
      // Save screenshot every poll
      await openvanPage.screenshot({ path: `/Users/gary/.openclaw/workspace/driver-monitor-${i+2}.png`, fullPage: true }).catch(() => {});
    } else if (url.includes('/driver-jobs')) {
      console.log(`  🎯 STAGE 2: At /driver-jobs!`);
      // Wait for content to load
      await openvanPage.waitForTimeout(3000);
      const jobsText = await openvanPage.locator('body').innerText().catch(() => '');
      console.log(`  📋 /driver-jobs content (first 1000 chars):`);
      console.log(`     ${jobsText.substring(0, 1000).replace(/\n/g, '\n     ')}`);
      // Look for booking counts
      const matchCount = (jobsText.match(/可接訂單[^\d]*(\d+)/) || [])[1];
      const poolCount = (jobsText.match(/全城待接[^\d]*(\d+)/) || [])[1];
      if (matchCount) console.log(`  📊 可接訂單: ${matchCount}`);
      if (poolCount) console.log(`  📊 全城待接: ${poolCount}`);
      await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-monitor-JOBS.png', fullPage: true });
      break;
    } else if (url === 'https://openvan.vercel.app/' || url === 'https://openvan.vercel.app') {
      console.log(`  ⏸  At root / — user is renter role? Or redirect?`);
      await openvanPage.screenshot({ path: `/Users/gary/.openclaw/workspace/driver-monitor-${i+2}.png`, fullPage: true }).catch(() => {});
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  await browser.close();
  console.log('');
  console.log('✅ Monitor complete. Check /Users/gary/.openclaw/workspace/driver-monitor-*.png');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
