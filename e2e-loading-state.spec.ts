import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Track loading state change after Google click', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Check button state before click
  const btnBefore = await page.locator('button:has-text("Google")');
  const btnTextBefore = await btnBefore.textContent();
  const isDisabledBefore = await btnBefore.isDisabled();
  console.log(`Button before click: text="${btnTextBefore}", disabled=${isDisabledBefore}`);

  // Click Google button
  await btnBefore.click();
  
  // Immediately check button state (should show "處理中…" if handleGoogle was called)
  await page.waitForTimeout(500);
  const btnTextDuring = await page.locator('button:has-text("Google")').textContent();
  const isDisabledDuring = await page.locator('button:has-text("Google")').isDisabled();
  console.log(`Button during/after click: text="${btnTextDuring}", disabled=${isDisabledDuring}`);
  
  // Wait for any response
  await page.waitForTimeout(5000);
  
  const btnTextAfter = await page.locator('button:has-text("Google")').textContent();
  const isDisabledAfter = await page.locator('button:has-text("Google")').isDisabled();
  console.log(`Button after wait: text="${btnTextAfter}", disabled=${isDisabledAfter}`);
  
  // Check for any toast notifications
  const toastTexts = await page.locator('[data-sonner-toast], .sonner-toast').allTextContents();
  console.log(`Toast texts: ${JSON.stringify(toastTexts)}`);
  
  console.log('All logs:', logs);
  console.log('Final URL:', page.url());
});