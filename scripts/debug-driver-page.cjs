// debug-driver-page.cjs
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
  console.log('Title:', await openvanPage.title());

  // Capture console errors
  const errors = [];
  const consoleLogs = [];
  openvanPage.on('pageerror', err => errors.push('PAGEERROR: ' + err.message + '\n' + (err.stack || '')));
  openvanPage.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE_ERROR: ' + msg.text());
    else consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Reload page to capture fresh errors
  console.log('\nReloading page...');
  await openvanPage.reload({ waitUntil: 'domcontentloaded' });

  // Wait for React to render
  await openvanPage.waitForTimeout(8000);

  // Get full HTML
  const html = await openvanPage.content();
  console.log('HTML length:', html.length);
  // Strip CSS to get cleaner view
  const bodyText = await openvanPage.locator('body').innerText();
  console.log('\nBody text:');
  console.log(bodyText || '(empty)');

  // Get page errors
  console.log('\n--- Page errors ---');
  if (errors.length === 0) console.log('(none)');
  else errors.forEach(e => console.log(e));

  // Take screenshot
  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-debug.png', fullPage: true });
  console.log('\n📸 Screenshot: /Users/gary/.openclaw/workspace/driver-debug.png');

  // Get React state via window.__APP_STATE__ or similar
  const appState = await openvanPage.evaluate(() => {
    // Try to find user info from React DevTools or window
    return {
      href: location.href,
      localStorage: Object.fromEntries(Object.entries(localStorage)),
      hasFirebaseAuth: !!window.firebase,
      hasReact: !!window.React,
    };
  });
  console.log('\nApp state:', JSON.stringify(appState, null, 2));

  await browser.close();
})();
