import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Directly invoke handleGoogle from page context', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Find and click the button using React's synthetic event system
  // First, let's check if the button actually has React event handlers
  const buttonInfo = await page.evaluate(() => {
    const btn = document.querySelector('button[onClick]') || 
                Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Google'));
    
    if (!btn) return { found: false };
    
    // Get all event listeners on this button using getEventListeners (requires DevTools)
    // Since we can't do that easily, let's just check if it's a React element
    const reactKey = Object.keys(btn).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    
    return {
      found: true,
      hasReactFiber: !!reactKey,
      text: btn.textContent,
      type: btn.getAttribute('type'),
      outerHTML: btn.outerHTML.substring(0, 200),
    };
  });
  
  console.log('Button info:', JSON.stringify(buttonInfo, null, 2));
  console.log('Logs before click:', logs);

  // Click using React's fireEvent instead of locators
  const btn = page.locator('button:has-text("Google")');
  await btn.click();
  
  await page.waitForTimeout(5000);
  
  console.log('Logs after click:', logs);
  console.log('URL after click:', page.url());
  
  // Try to manually trigger the handleGoogle by accessing React internals
  const reactTriggerResult = await page.evaluate(async () => {
    try {
      // Try to find the React component instance
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Google'));
      if (!btn) return 'button not found';
      
      // Try dispatching a React event
      const reactFiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber'));
      if (!reactFiberKey) return 'no react fiber found';
      
      return { reactFiberFound: true, key: reactFiberKey };
    } catch (e: any) {
      return { error: e.message };
    }
  });
  
  console.log('React trigger result:', reactTriggerResult);
});