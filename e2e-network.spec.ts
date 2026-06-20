import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Capture all Firebase network requests on login page', async ({ page }) => {
  const firebaseRequests: string[] = [];
  const firebaseResponses: string[] = [];

  page.on('request', req => {
    const url = req.url();
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('firebaseio')) {
      firebaseRequests.push(`→ ${req.method()} ${url}`);
    }
  });

  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('firebaseio')) {
      firebaseResponses.push(`← HTTP ${resp.status()} ${url}`);
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('=== FIREBASE REQUESTS ON LOAD ===');
  firebaseRequests.forEach(r => console.log(r));
  console.log('=== FIREBASE RESPONSES ON LOAD ===');
  firebaseResponses.forEach(r => console.log(r));

  // Now trigger Google login and capture requests
  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();
  await page.waitForTimeout(5000);

  console.log('=== FIREBASE REQUESTS AFTER GOOGLE CLICK ===');
  firebaseRequests.forEach(r => console.log(r));
  console.log('=== FIREBASE RESPONSES AFTER GOOGLE CLICK ===');
  firebaseResponses.forEach(r => console.log(r));
  console.log('=== CURRENT URL ===');
  console.log(page.url());
});