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

  console.log('Current URL:', openvanPage.url());

  // Hard reload to get new bundle
  console.log('Hard reload...');
  await openvanPage.reload({ waitUntil: 'domcontentloaded' });
  await openvanPage.waitForTimeout(5000);

  // Capture errors
  const errors = [];
  openvanPage.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  openvanPage.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  await openvanPage.waitForTimeout(3000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-after-fix.png', fullPage: true });

  console.log('After reload URL:', openvanPage.url());
  const body = await openvanPage.locator('body').innerText();
  console.log('Body text:');
  console.log(body.split('\n').map(l => '  ' + l).join('\n').substring(0, 2000));

  console.log('\nErrors:');
  if (errors.length === 0) console.log('  (none)');
  else errors.forEach(e => console.log('  ' + e));

  await browser.close();
})();
