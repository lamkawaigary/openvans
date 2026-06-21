// driver-side-test.cjs
// Connect to driver-side Chrome via CDP (localhost:9223) and verify
// the driver UI displays pending bookings.

const { chromium } = require('playwright');

async function main() {
  console.log('🔌 Connecting to driver Chrome via CDP at localhost:9223...');
  const browser = await chromium.connectOverCDP('http://localhost:9223');

  const contexts = browser.contexts();
  console.log(`📁 Contexts: ${contexts.length}`);

  // Find the OpenVan page
  let openvanPage = null;
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      const url = page.url();
      if (url.includes('openvan.vercel.app')) {
        openvanPage = page;
        console.log(`✅ Found OpenVan page: ${url}`);
        break;
      }
    }
    if (openvanPage) break;
  }

  if (!openvanPage) {
    console.log('❌ No OpenVan page found. Pages available:');
    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        console.log(`  - ${page.url()}`);
      }
    }
    process.exit(1);
  }

  // Wait for any pending navigations
  await openvanPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Take initial screenshot
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-1-current.png', fullPage: true });
  const title1 = await openvanPage.title();
  const url1 = openvanPage.url();
  const bodyText1 = await openvanPage.locator('body').innerText().catch(() => '(could not read)');
  console.log(`📄 Current state:`);
  console.log(`  Title: ${title1}`);
  console.log(`  URL: ${url1}`);
  console.log(`  Body text (first 500 chars): ${bodyText1.substring(0, 500)}`);

  // === STAGE 1: Pre-sign-in - we're at /login ===
  if (url1.includes('/login')) {
    console.log('');
    console.log('━'.repeat(60));
    console.log('⏸  STAGE 1: At /login — waiting for user to sign in as garylkw1842@gmail.com');
    console.log('━'.repeat(60));
    console.log('');
    console.log('Please sign in now using "使用 Google 帳戶登入" button,');
    console.log('then select garylkw1842@gmail.com (KW 1842) in the Google popup.');
    console.log('');
    console.log('Once signed in, press ENTER in this terminal to continue...');

    // Wait for user to press enter
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
  }

  // === STAGE 2: Post-sign-in - should be at / or /driver-jobs ===
  await openvanPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  // Hard refresh to ensure new bundle
  console.log('🔄 Hard refresh (Cmd+Shift+R) to load new bundle...');
  await openvanPage.reload({ waitUntil: 'networkidle' });

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-2-after-refresh.png', fullPage: true });
  const title2 = await openvanPage.title();
  const url2 = openvanPage.url();
  const bodyText2 = await openvanPage.locator('body').innerText().catch(() => '(could not read)');
  console.log(`📄 After refresh:`);
  console.log(`  Title: ${title2}`);
  console.log(`  URL: ${url2}`);
  console.log(`  Body text (first 800 chars): ${bodyText2.substring(0, 800)}`);

  // === STAGE 3: Navigate to /driver-jobs explicitly ===
  console.log('');
  console.log('━'.repeat(60));
  console.log('🧭 Navigating to /driver-jobs');
  console.log('━'.repeat(60));
  await openvanPage.goto('https://openvan.vercel.app/driver-jobs', { waitUntil: 'networkidle' });
  await openvanPage.waitForTimeout(2000); // Let Firestore subscribe fire

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-3-jobs.png', fullPage: true });
  const title3 = await openvanPage.title();
  const url3 = openvanPage.url();
  const bodyText3 = await openvanPage.locator('body').innerText().catch(() => '(could not read)');
  console.log(`📄 /driver-jobs state:`);
  console.log(`  Title: ${title3}`);
  console.log(`  URL: ${url3}`);
  console.log(`  Body text (first 1500 chars): ${bodyText3.substring(0, 1500)}`);

  // Check for specific UI elements
  const stats = {
    hasMatchCount: bodyText3.includes('可接訂單'),
    hasPoolCount: bodyText3.includes('全城待接'),
    hasPendingJob: /待接|確認|in_progress|等待|接受/.test(bodyText3),
    hasLightVehicle: bodyText3.includes('light') || bodyText3.includes('Light'),
    hasSedanVehicle: bodyText3.includes('sedan') || bodyText3.includes('Sedan'),
  };
  console.log('');
  console.log('🔍 UI checks:');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${v ? '✅' : '❌'} ${k}: ${v}`);
  }

  // Try to extract job counts from page text
  const matchCountMatch = bodyText3.match(/可接訂單[^\d]*(\d+)/);
  const poolCountMatch = bodyText3.match(/全城待接[^\d]*(\d+)/);
  if (matchCountMatch) console.log(`  📊 可接訂單 (match): ${matchCountMatch[1]}`);
  if (poolCountMatch) console.log(`  📊 全城待接 (pool): ${poolCountMatch[1]}`);

  await browser.close();
  console.log('');
  console.log('✅ Done. Screenshots saved to /Users/gary/.openclaw/workspace/driver-*.png');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
