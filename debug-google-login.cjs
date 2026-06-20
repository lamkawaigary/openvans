const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const networkRequests = [];
  const errors = [];
  
  // Capture all network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('google') || url.includes('firebase') || url.includes('auth') || url.includes('identitytoolkit')) {
      networkRequests.push({
        url: url.substring(0, 200),
        method: request.method(),
        headers: request.headers()
      });
    }
  });
  
  // Capture all responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('google') || url.includes('firebase') || url.includes('auth') || url.includes('identitytoolkit')) {
      try {
        const body = await response.text().catch(() => '');
        networkRequests.push({
          url: url.substring(0, 200),
          status: response.status(),
          body: body.substring(0, 500)
        });
      } catch (e) {}
    }
  });
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  console.log('Navigating to login page...');
  await page.goto('https://openvan.vercel.app/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  console.log('Clicking Google login button...');
  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();
  
  // Wait for redirect or popup
  console.log('Waiting for auth flow...');
  await page.waitForTimeout(8000);
  
  console.log('\n=== ERRORS ===');
  errors.forEach(e => console.log('ERROR:', e));
  
  console.log('\n=== NETWORK REQUESTS ===');
  networkRequests.forEach(r => {
    console.log(`${r.method || 'RESPONSE'} ${r.status || ''}: ${r.url}`);
    if (r.body) console.log('  Body:', r.body.substring(0, 200));
  });
  
  console.log('\n=== CURRENT URL ===');
  console.log(page.url());
  
  await page.screenshot({ path: '/tmp/google_login_debug.png', fullPage: true });
  console.log('Screenshot saved');
  
  await browser.close();
})();
