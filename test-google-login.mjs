import { chromium } from 'playwright';

async function testGoogleLogin() {
  // Launch browser with full UI (not headless) to test real popup
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true
  });
  const page = await context.newPage();
  
  consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() !== 'log') consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  console.log('Testing Google Login on OpenVans (with visible browser)...');
  
  try {
    await page.goto('https://openvans.web.app/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    console.log('Title:', await page.title());
    
    const googleButton = await page.locator('button:has-text("以 Google 登入")').first();
    const isVisible = await googleButton.isVisible();
    
    if (isVisible) {
      console.log('✅ Google login button visible');
      console.log('Clicking button...');
      await googleButton.click();
      
      // Wait up to 15 seconds for any popup or redirect
      console.log('Waiting for popup or redirect...');
      
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(500);
        const urls = page.frames().map(f => f.url()).filter(u => u.includes('accounts.google.com'));
        if (urls.length > 0) {
          console.log('✅ Google accounts page loaded in frame!');
          console.log('Frame URL:', urls[0].substring(0, 150));
          break;
        }
        const currentUrl = page.url();
        if (!currentUrl.includes('openvans.web.app/login')) {
          console.log('URL changed:', currentUrl);
          break;
        }
        if (i % 5 === 0) console.log('Waiting...', (i+1)*500, 'ms');
      }
      
    }
    
    console.log('Final URL:', page.url());
    
    // Check for any errors
    const errors = consoleLogs.filter(l => l.includes('[error]'));
    if (errors.length > 0) {
      console.log('\n⚠️  Errors:', errors);
    } else {
      console.log('\n✅ No errors!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

let consoleLogs = [];
testGoogleLogin();