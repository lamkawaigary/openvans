// inspect-gsi.cjs — Wait for Google Sign-In (GSI) to render and inspect
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

  console.log('URL:', openvanPage.url());

  // Wait for GSI iframe to appear
  try {
    await openvanPage.waitForSelector('iframe[src*="accounts.google.com/gsi/button"]', { timeout: 30000 });
    console.log('✅ GSI iframe found');
  } catch (e) {
    console.log('❌ GSI iframe not found after 30s');
  }

  // Wait additional 5s for GSI button to fully render
  await openvanPage.waitForTimeout(5000);

  // List all iframes
  const frames = openvanPage.frames();
  console.log(`\nTotal frames: ${frames.length}`);
  for (const f of frames) {
    console.log(`  - ${f.url().substring(0, 100)}`);
  }

  // Take screenshot
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/inspect-gsi.png', fullPage: true });

  // Get body text now
  const text = await openvanPage.locator('body').innerText();
  console.log('\nBody text now:');
  console.log(text);

  // Get all buttons
  const buttons = await openvanPage.locator('button').allInnerTexts();
  console.log('\nButtons:');
  console.log(buttons);

  // Get all visible elements
  const allText = await openvanPage.locator('div, button, span, a').allInnerTexts();
  console.log('\nAll visible text (incl iframes):');
  console.log(allText);

  await browser.close();
})();
