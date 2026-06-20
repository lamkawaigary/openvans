import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Check if Firebase SDK modules are being loaded', async ({ page }) => {
  const networkLogs: string[] = [];
  
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    networkLogs.push(`[${route.request().method()}] ${url}`);
    await route.continue();
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Filter for Firebase SDK requests
  const firebaseRequests = networkLogs.filter(u => 
    u.includes('firebasejs') || 
    u.includes('firebase-app') ||
    u.includes('firebase-auth') ||
    u.includes('gstatic.com/firebasejs')
  );

  console.log('=== FIREBASE SDK REQUESTS ===');
  firebaseRequests.forEach(r => console.log(r));
  
  console.log('=== ALL NETWORK (first 20) ===');
  networkLogs.slice(0, 20).forEach(r => console.log(r));
  
  // Check if firebase SDK scripts are in the DOM
  const sdkInfo = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const firebaseScripts = scripts.filter(s => 
      s.src.includes('firebase') || s.src.includes('gstatic')
    );
    return {
      totalScripts: scripts.length,
      firebaseScripts: firebaseScripts.map(s => s.src),
      allScriptSrcs: scripts.map(s => s.src),
    };
  });
  
  console.log('SDK info:', JSON.stringify(sdkInfo, null, 2));
  
  // Try to dynamically import firebase to see if it loads
  const importResult = await page.evaluate(async () => {
    try {
      const mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      return { success: true, exports: Object.keys(mod) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  
  console.log('Dynamic import result:', importResult);
});