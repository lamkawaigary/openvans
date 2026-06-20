import { test, expect, Page } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Deep dive - capture all network + console during Google login', async ({ page }) => {
  const networkErrors: string[] = [];
  const consoleErrors: string[] = [];
  const allResponses: string[] = [];

  // Capture all network failures
  page.on('requestfailed', req => {
    networkErrors.push(`FAIL: ${req.url()} - ${req.failure()?.errorText}`);
  });

  // Capture all non-200 responses
  page.on('response', resp => {
    if (!resp.ok() && resp.url().includes('firebase')) {
      allResponses.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  // Capture console
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[ERROR] ${msg.text()}`);
    if (msg.type() === 'warn' && msg.text().includes('Firebase')) {
      consoleErrors.push(`[WARN] ${msg.text()}`);
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('=== INITIAL LOAD ERRORS ===');
  console.log('Network errors:', networkErrors);
  console.log('Console errors:', consoleErrors);
  console.log('Firebase responses:', allResponses);

  // Now check if Firebase actually initialized by evaluating in page context
  const firebaseStatus = await page.evaluate(() => {
    // @ts-ignore
    const win = window as any;
    return {
      hasFirebase: typeof win.firebase !== 'undefined',
      hasAuth: typeof win.firebase?.auth !== 'undefined',
      firebaseConfigs: Object.keys(win).filter(k => k.includes('firebase') || k.includes('Firebase')),
    };
  });
  console.log('Firebase status:', firebaseStatus);

  // Try clicking Google button
  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();

  // Wait for any popup/redirect
  await page.waitForTimeout(8000);

  console.log('=== AFTER CLICK ===');
  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());
  console.log('New network errors:', networkErrors);
  console.log('New console errors:', consoleErrors);

  // Check for any modal/error dialog
  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('Illegal') || bodyText.includes('error') || bodyText.includes('錯誤')) {
    console.log('Body contains error text (first 300 chars):', bodyText.substring(0, 300));
  }
});