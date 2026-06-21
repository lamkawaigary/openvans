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
  await openvanPage.bringToFront();

  // Wait for any pending load
  await openvanPage.waitForTimeout(2000);

  // Capture errors
  const errors = [];
  openvanPage.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  openvanPage.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  await openvanPage.waitForTimeout(2000);

  await openvanPage.screenshot({ path: '/Users/gary/.openclaw/workspace/driver-verified.png', fullPage: true });

  // Get full body text
  const body = await openvanPage.locator('body').innerText();
  console.log('Body text:');
  console.log(body.split('\n').map(l => '  ' + l).join('\n').substring(0, 2000));

  // Check critical elements
  const checks = {
    hasJobCount2: body.includes('可接訂單\n2') || body.includes('2\n可接訂單') || /\b2\b.*可接訂單/.test(body),
    hasPoolCount3: body.includes('全城待接\n3') || body.includes('3\n全城待接') || /\b3\b.*全城待接/.test(body),
    hasOnlineStatus: body.includes('已上線'),
    hasLightVehicle: body.includes('輕型貨車'),
    hasTwoJobCards: (body.match(/接單/g) || []).length >= 2,
  };
  console.log('\nChecks:');
  for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? '✅' : '❌'} ${k}: ${v}`);
  }

  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach(e => console.log('  ' + e));
  } else {
    console.log('\n✅ 0 JS errors');
  }

  await browser.close();
})();
