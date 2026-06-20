import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Direct signInWithPopup call to capture error', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Inject comprehensive error tracking before trying signInWithPopup
  await page.evaluate(() => {
    (window as any).__errors = [];
    const origError = console.error;
    console.error = (...args: any[]) => {
      (window as any).__errors.push(args.map(String).join(' '));
      origError.apply(console, args);
    };
  });

  // Now try to call signInWithPopup directly via the bundled code
  const result = await page.evaluate(async () => {
    try {
      // First check if firebase is initialized
      const firebase = (window as any).firebase;
      if (!firebase) {
        return { error: 'window.firebase is not defined - Firebase SDK not loaded via global' };
      }
      
      const apps = firebase.apps;
      if (!apps || apps.length === 0) {
        return { error: 'No Firebase app initialized - apps:', apps };
      }
      
      const auth = firebase.auth(firebase.apps[0]);
      if (!auth) {
        return { error: 'firebase.auth() returned null/undefined' };
      }
      
      // Try signInWithPopup - this will open a popup
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth(firebase.apps[0]).signInWithPopup(provider);
      return { success: true, email: result.user?.email };
    } catch (e: any) {
      return { 
        error: e.message, 
        code: e.code,
        errorInfo: e.errorInfo?.message,
        stack: e.stack?.split('\n').slice(0, 5).join('\n')
      };
    }
  });

  console.log('Direct signInWithPopup result:', JSON.stringify(result, null, 2));
  
  const errors = await page.evaluate(() => (window as any).__errors || []);
  console.log('Console errors captured:', errors);
  console.log('All logs:', logs);
});