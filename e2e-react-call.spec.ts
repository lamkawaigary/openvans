import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Call AuthContext signInWithGoogle via React fiber', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Find the LoginPage component and call its handleGoogle
  const result = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Find button
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Google')
      );
      if (!btn) {
        resolve({ error: 'Button not found' });
        return;
      }

      // Get React fiber
      const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber'));
      if (!fiberKey) {
        resolve({ error: 'No React fiber on button' });
        return;
      }
      
      let fiber = (btn as any)[fiberKey];
      
      // Walk up the fiber tree to find the component with handleGoogle
      let handleGoogleFn = null;
      let depth = 0;
      while (fiber && depth < 20) {
        const props = fiber.memoizedProps || fiber.memoized?.props || {};
        if (props.onClick && typeof props.onClick === 'function') {
          // Found the onClick handler
          // Try to trace it back to handleGoogle
          handleGoogleFn = props.onClick;
          break;
        }
        fiber = fiber.return;
        depth++;
      }
      
      if (handleGoogleFn) {
        try {
          // Call handleGoogle - it should be async
          const result = handleGoogleFn({ preventDefault: () => {}, stopPropagation: () => {} });
          if (result && typeof result.then === 'function') {
            result.then((r: any) => resolve({ called: true, result: r }))
                  .catch((e: any) => resolve({ called: true, error: e.message, code: e.code }));
          } else {
            resolve({ called: true, result: 'sync function' });
          }
        } catch (e: any) {
          resolve({ error: e.message, code: e.code });
        }
      } else {
        resolve({ error: 'handleGoogle not found in fiber chain', depth });
      }
    });
  });

  console.log('handleGoogle call result:', JSON.stringify(result, null, 2));
  
  // Wait for any async operations
  await page.waitForTimeout(5000);
  
  console.log('Logs after wait:', logs);
  console.log('Current URL:', page.url());
});