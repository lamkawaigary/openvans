import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('DispatchEvent vs click difference', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const btn = page.locator('button:has-text("Google")');
  
  // Try using Playwright's click
  console.log('=== Testing with page.locator().click() ===');
  await btn.click();
  await page.waitForTimeout(2000);
  console.log('URL after click():', page.url());
  console.log('Logs after click():', logs);
  
  // Check button text
  const btnText = await btn.textContent();
  console.log('Button text:', btnText);
  
  // Now try dispatchEvent directly
  logs.length = 0;
  console.log('=== Testing with dispatchEvent() ===');
  await btn.dispatchEvent('click');
  await page.waitForTimeout(2000);
  console.log('URL after dispatchEvent():', page.url());
  console.log('Logs after dispatchEvent():', logs);
  
  // Try React's internal onClick via fiber
  logs.length = 0;
  console.log('=== Testing via React fiber onClick ===');
  const reactResult = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Google'));
    if (!btn) return 'button not found';
    
    // Get React fiber
    const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return 'no fiber';
    
    const fiber = (btn as any)[fiberKey];
    if (!fiber) return 'fiber null';
    
    // Try to find and call onClick from fiber
    let onClick = null;
    let current = fiber;
    while (current) {
      if (current.memoizedProps?.onClick) {
        onClick = current.memoizedProps.onClick;
        break;
      }
      if (current.memoizedProps?.onClickCapture) {
        onClick = current.memoizedProps.onClickCapture;
        break;
      }
      current = current.return;
    }
    
    if (onClick) {
      try {
        onClick({ preventDefault: () => {}, stopPropagation: () => {} });
        return 'onClick called successfully';
      } catch (e: any) {
        return `onClick error: ${e.message}`;
      }
    }
    return 'onClick not found in fiber chain';
  });
  
  console.log('React fiber onClick result:', reactResult);
  await page.waitForTimeout(3000);
  console.log('Logs after fiber call:', logs);
  console.log('URL after fiber call:', page.url());
});