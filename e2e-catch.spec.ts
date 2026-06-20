import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Catch all errors during Google login attempt', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[ERROR] ${msg.text()}`);
    if (msg.type() === 'log') logs.push(`[LOG] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Inject a wrapper to catch the actual signInWithPopup error
  await page.evaluate(() => {
    // Intercept console.error to capture Firebase auth errors
    const origError = console.error;
    console.error = (...args: any[]) => {
      window.postMessage({ type: 'console-error', args: args.map(String) }, '*');
      origError.apply(console, args);
    };
    
    // Listen for postMessage from page
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'console-error') {
        console.log('CAUGHT ERROR:', e.data.args);
      }
    });
  });

  // Now try to trigger the Google login
  const googleBtn = page.locator('button:has-text("Google")');
  
  // Before clicking, set up a listener for any errors that occur
  const errorPromise = page.waitForEvent('console', msg => 
    msg.type() === 'error' && 
    (msg.text().includes('Firebase') || msg.text().includes('auth') || msg.text().includes('signIn'))
  , { timeout: 5000 }).catch(() => null);

  await googleBtn.click();
  
  // Wait for any error to appear
  const errorMsg = await errorPromise;
  if (errorMsg) {
    console.log('Caught auth error:', errorMsg.text());
  }
  
  await page.waitForTimeout(5000);
  
  console.log('All errors:', errors);
  console.log('All logs:', logs);
  console.log('Current URL:', page.url());
});