import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Google login - capture exact error', async ({ page }) => {
  const errors: string[] = [];
  const consoleMessages: string[] = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));
  page.on('requestfailed', req => errors.push(`REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`));
  page.on('response', resp => {
    if (!resp.ok()) errors.push(`HTTP ${resp.status()} ${resp.url()}`);
  });

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check Firebase config is loaded
  const firebaseErrors = errors.filter(e =>
    e.includes('Firebase') ||
    e.includes('apiKey') ||
    e.includes('auth/') ||
    e.includes('firebaseapp')
  );

  console.log('=== ALL CONSOLE MESSAGES ===');
  consoleMessages.forEach(m => console.log(m));
  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(e));

  // Try clicking Google button and see what happens
  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();

  // Wait for any popup or redirect
  await page.waitForTimeout(5000);

  console.log('=== AFTER CLICK ===');
  console.log('Current URL:', page.url());
  console.log('Title:', page.title());

  // Check if error dialog appeared
  const errorDialog = page.locator('text=Illegal url');
  const hasError = await errorDialog.count() > 0;
  console.log('Has "Illegal url" error:', hasError);

  if (hasError) {
    // Capture the error details
    const errorText = await page.locator('body').innerText();
    console.log('Page content (error area):', errorText.substring(0, 500));
  }
});