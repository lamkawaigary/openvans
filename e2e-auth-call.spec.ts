import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Call signInWithGoogle directly and capture error', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Inject comprehensive error capturing before calling signInWithGoogle
  const result = await page.evaluate(async () => {
    return new Promise(async (resolve) => {
      try {
        // Intercept all Firebase auth operations
        const originalSignInWithPopup = window.eval(`
          (async () => {
            // Try to find auth instance from the React app
            // First, get firebase from the page's module system
            const firebaseModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
            const { getApps, getApp } = firebaseModule;
            
            let app;
            try {
              app = getApp();
            } catch (e) {
              resolve({ error: 'No Firebase app found', detail: e.message });
              return;
            }
            
            const authModule = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
            const { getAuth, signInWithPopup } = authModule;
            const auth = getAuth(app);
            
            const provider = new authModule.GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            resolve({ success: true, email: result.user?.email });
          })()
        `);
      } catch (e: any) {
        resolve({ error: e.message, stack: e.stack?.split('\n')[0] });
      }
    });
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Logs:', logs);
});