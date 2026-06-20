import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Check if popup window opens - headed test', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Set up popup detection BEFORE clicking
  const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
  
  // Also watch for any new windows
  page.on('window', (window) => {
    logs.push(`[WINDOW] New window opened: ${window.url()}`);
  });

  // Click Google button
  const btn = page.locator('button:has-text("Google")');
  await btn.click();
  
  // Wait a bit
  await page.waitForTimeout(3000);
  
  const popup = await popupPromise;
  console.log('Popup detected:', popup?.url() || 'none');
  console.log('All logs:', logs);
  console.log('URL:', page.url());
  
  // Check for toast notification
  const toastVisible = await page.locator('[data-sonner-toaster], [class*="sonner"]').count();
  console.log('Toasts visible:', toastVisible);
});