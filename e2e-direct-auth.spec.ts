import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Direct Firebase signInWithPopup test', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Directly test Firebase Auth in the page context
  const result = await page.evaluate(async () => {
    try {
      // Import Firebase dynamically
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      
      // Get the existing app or create one with hardcoded config
      const { getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      let app;
      try {
        app = getApp();
      } catch {
        // No app, create one with config from environment
        app = initializeApp({
          apiKey: "AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU",
          authDomain: "opensystem-857b2.firebaseapp.com",
          projectId: "opensystem-857b2",
          storageBucket: "opensystem-857b2.firebasestorage.app",
          messagingSenderId: "828737485195",
          appId: "1:828737485195:web:86d8fa39942d3a7dabd78e",
        });
      }
      
      const auth = getAuth(app);
      
      // Try signInWithPopup
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return { 
        success: true, 
        user: result.user.email,
        credential: !!result._tokenResponse
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: e.message,
        code: e.code,
        errorInfo: e.errorInfo,
        stack: e.stack?.split('\n').slice(0, 3).join('\n')
      };
    }
  });

  console.log('Direct Firebase test result:', JSON.stringify(result, null, 2));
  console.log('Console logs:', logs);
});