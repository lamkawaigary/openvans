import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Inject Firebase check into page', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(5000);

  // Inject test code that waits for firebase to load
  const result = await page.evaluate(() => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        const firebase = (window as any).firebase;
        const firebaseui = (window as any).firebaseui;
        const firebaseAuth = (window as any).firebase?.auth;
        
        resolve({
          attempts,
          firebase: !!firebase,
          firebaseAuth: !!firebaseAuth,
          firebaseui: !!firebaseui,
          keys: Object.keys(window).filter(k => 
            k.toLowerCase().includes('firebase') || 
            k.toLowerCase().includes('auth')
          ),
        });
      };
      // Check immediately
      setTimeout(check, 0);
      // Also check after 3s
      setTimeout(check, 3000);
    });
  });

  console.log('Result:', result);
  console.log('Console logs:', logs);
});