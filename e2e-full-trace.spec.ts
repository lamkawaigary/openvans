import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Full tracing - intercept ALL Firebase calls during Google login', async ({ page }) => {
  const allLogs: string[] = [];
  const networkLogs: string[] = [];
  
  page.on('console', msg => allLogs.push(`[CONSOLE:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => allLogs.push(`[PAGEERROR] ${err.message}`));
  
  // Intercept ALL fetch requests to see what Firebase is doing
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('identitytoolkit') || url.includes('googile')) {
      networkLogs.push(`[REQUEST] ${route.request().method()} ${url}`);
    }
    await route.continue();
  });

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('=== BEFORE CLICK - Network logs ===');
  networkLogs.forEach(l => console.log(l));
  console.log('=== BEFORE CLICK - Console logs ===');
  allLogs.forEach(l => console.log(l));

  // Clear logs
  networkLogs.length = 0;
  allLogs.length = 0;

  // Now click Google button
  console.log('=== CLICKING GOOGLE BUTTON ===');
  const btn = page.locator('button:has-text("Google")');
  await btn.click();
  
  // Wait and collect all activity
  await page.waitForTimeout(8000);

  console.log('=== AFTER CLICK - Network logs ===');
  networkLogs.forEach(l => console.log(l));
  console.log('=== AFTER CLICK - Console logs ===');
  allLogs.forEach(l => console.log(l));
  console.log('=== URL ===', page.url());
});