// audit-driver-pages.cjs
// Compare /trips and /dashboard to find overlap + broken page
const { chromium } = require('playwright');

async function inspect(page, url, label) {
  console.log('\n' + '='.repeat(60));
  console.log(`🧭 ${label}: ${url}`);
  console.log('='.repeat(60));

  const errors = [];
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (e) {
    console.log(`❌ Navigation failed: ${e.message}`);
    return;
  }
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  console.log(`Final URL: ${finalUrl}`);

  await page.screenshot({ path: `/Users/gary/.openclaw/workspace/driver-audit-${label}.png`, fullPage: true });

  let body = '';
  try {
    body = await page.locator('body').innerText({ timeout: 2000 });
  } catch (e) {
    body = '(could not read)';
  }
  console.log(`Body text (first 1500):`);
  console.log(body.split('\n').slice(0, 60).map(l => '  ' + l).join('\n'));

  console.log(`\nJS errors: ${errors.length}`);
  if (errors.length > 0) errors.forEach(e => console.log('  ' + e.substring(0, 200)));
}

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

  // First: /trips
  await inspect(openvanPage, 'https://openvan.vercel.app/trips', 'trips');

  // Second: /dashboard
  await inspect(openvanPage, 'https://openvan.vercel.app/dashboard', 'dashboard');

  // Third: /my-vans (sanity check)
  await inspect(openvanPage, 'https://openvan.vercel.app/my-vans', 'myvans');

  await browser.close();
})();
