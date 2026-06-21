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
  
  // Wait a bit for any pending load
  await openvanPage.waitForTimeout(2000);
  
  // Get HTML
  const html = await openvanPage.content();
  console.log('HTML length:', html.length);
  console.log('HTML preview (first 3000):');
  console.log(html.substring(0, 3000));
  
  // Get all visible text
  const text = await openvanPage.locator('body').innerText();
  console.log('\n--- Body text ---');
  console.log(text);
  
  // List all visible button texts
  const buttons = await openvanPage.locator('button').allInnerTexts();
  console.log('\n--- Buttons ---');
  console.log(buttons);
  
  // Console errors
  const errors = [];
  openvanPage.on('pageerror', err => errors.push(err.message));
  openvanPage.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  await openvanPage.waitForTimeout(2000);
  console.log('\n--- Errors ---');
  console.log(errors);
  
  await browser.close();
})();
