import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Hook signInWithPopup to capture exact error', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Hook into the Firebase auth module to intercept signInWithPopup
  await page.evaluate(() => {
    // Store original fetch to intercept network requests
    const origFetch = window.fetch;
    (window as any).__firebaseRequests = [];
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';
      if (url.includes('googleapis') || url.includes('firebase') || url.includes('identitytoolkit')) {
        (window as any).__firebaseRequests.push({ url, method: args[1]?.method || 'GET' });
        console.log('Firebase request:', url);
      }
      return origFetch(...args);
    };

    // Intercept console.error to catch Firebase errors
    const origError = console.error;
    console.error = (...args: any[]) => {
      console.log('console.error:', ...args);
      origError.apply(console, args);
    };

    console.log('Hooks installed');
  });

  // Click Google button
  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();
  
  await page.waitForTimeout(5000);
  
  const firebaseRequests = await page.evaluate(() => (window as any).__firebaseRequests || []);
  console.log('Firebase network requests captured:', firebaseRequests);
  console.log('All console logs:', logs);
  console.log('Current URL:', page.url());
  
  // Also try to check if handleGoogle was even called
  const buttonClicked = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Try to get the auth instance from the page
      // by waiting a bit and checking
      setTimeout(() => {
        const requests = (window as any).__firebaseRequests || [];
        resolve({ firebaseRequestsCount: requests.length, requests });
      }, 2000);
    });
  });
  
  console.log('After click check:', buttonClicked);
});