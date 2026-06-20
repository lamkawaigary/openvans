import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Firebase initialization - test in browser context', async ({ page }) => {
  const allConsole: string[] = [];
  page.on('console', msg => allConsole.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => allConsole.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  
  // Wait for page to fully load
  await page.waitForTimeout(5000);

  // Check for any auth initialization
  const firebaseInit = await page.evaluate(() => {
    // Check if firebase app was initialized by looking at the firebase namespace
    const apps = (window as any).firebase?.apps;
    return {
      firebaseNamespaceExists: !!(window as any).firebase,
      appsCount: apps?.length ?? 0,
      appNames: apps ? apps.map((a: any) => a.name) : [],
    };
  });
  
  console.log('Firebase init state:', firebaseInit);
  console.log('All console messages:', allConsole);
  
  // Now try to manually check if signInWithPopup would work
  const popupTest = await page.evaluate(async () => {
    try {
      // Wait a bit more for firebase to fully load
      await new Promise(r => setTimeout(r, 2000));
      
      // Try to access auth
      const auth = (window as any).firebase?.auth?.();
      if (!auth) return { error: 'firebase.auth() returned undefined' };
      
      return { 
        authExists: true, 
        currentUser: auth.currentUser ? 'logged in' : 'not logged in',
        languageCode: auth.languageCode,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  });
  
  console.log('Popup test:', popupTest);
  
  // If firebase is not initialized, log ALL console errors
  if (!firebaseInit.appsCount) {
    console.log('!!! Firebase not initialized !!!');
    console.log('Full console log:');
    allConsole.forEach(m => console.log(m));
  }
});