import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Direct Firebase initialization test in browser', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Try to manually initialize Firebase and see what error we get
  const result = await page.evaluate(async () => {
    try {
      // Wait for firebase module to be available
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      
      // Try to get existing apps
      const { getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const existingApps = getApps();
      
      // If no app exists, initialize one with the config from the page
      let app;
      if (existingApps.length === 0) {
        // The config should be embedded in the page somewhere
        // Try to find it by looking at the firebase config used by the app
        const configScript = document.querySelector('script[type="application/json"]');
        let config = null;
        if (configScript) {
          try { config = JSON.parse(configScript.textContent || ''); } catch {}
        }
        
        return { 
          status: 'no_apps',
          existingApps: 0,
          error: 'Firebase not initialized - no app found. AuthContext must not have run initializeApp.'
        };
      }
      
      app = existingApps[0];
      const auth = getAuth(app);
      
      // Try to sign in - this should trigger a network request
      const provider = new GoogleAuthProvider();
      
      // Don't actually call signInWithPopup - just check if it would work
      return {
        status: 'ready',
        appName: app.name,
        apiKey: app.options.apiKey,
        authDomain: app.options.authDomain,
        currentUser: auth.currentUser ? auth.currentUser.email : null,
      };
    } catch (e: any) {
      return { status: 'error', error: e.message, stack: e.stack?.split('\n')[0] };
    }
  });

  console.log('Firebase direct test result:', JSON.stringify(result, null, 2));
  console.log('Console logs:', logs);
});