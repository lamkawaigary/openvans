import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Capture exact error when clicking Google login', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[ERROR] ${msg.text()}`);
    if (msg.type() === 'log') console.log(`[LOG] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[PAGEERROR] ${err.message}`);
    errors.push(`[PAGEERROR] ${err.message}`);
  });

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Override showNotification to capture errors
  await page.evaluate(() => {
    (window as any).__notifications = [];
    const origSonner = (window as any).sonner;
    // Just log what happens
  });

  // Click Google button
  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();
  
  // Wait for any error
  await page.waitForTimeout(5000);
  
  console.log('Errors captured:', errors);
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Check if there's a toast notification visible
  const toast = await page.locator('[data-sonner-toaster], .sonner-toast, [class*="toast"]').count();
  console.log('Toast notifications visible:', toast);
  
  // Try to read any visible error text on page
  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('錯誤') || bodyText.includes('error') || bodyText.includes('Error')) {
    console.log('Page has error text:', bodyText.substring(0, 200));
  }
});