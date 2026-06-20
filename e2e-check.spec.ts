import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Check Firebase Auth initialization state', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'log') console.log(`[LOG] ${msg.text()}`);
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Inject a test to check Firebase Auth
  const result = await page.evaluate(async () => {
    try {
      // Try to dynamically import firebase auth and check
      const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      
      // Check if there's a default app
      let appExists = false;
      let authExists = false;
      let currentUser = null;
      
      try {
        const app = getApp();
        appExists = !!app;
        if (app) {
          const auth = getAuth(app);
          authExists = !!auth;
          currentUser = auth?.currentUser ? 'logged in' : 'not logged in';
        }
      } catch (e: any) {
        return { error: e.message, appExists, authExists };
      }
      
      return { appExists, authExists, currentUser, gapiLoaded: !!(window as any).gapi };
    } catch (e: any) {
      return { importError: e.message };
    }
  });

  console.log('Firebase check result:', JSON.stringify(result, null, 2));
  console.log('Console errors during check:', errors);
});