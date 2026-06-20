import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Trace handleGoogle execution step by step', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // First, inject debugging BEFORE clicking
  await page.evaluate(() => {
    console.log('=== INJECT: Setting up tracing ===');
    
    // Wait for React to fully hydrate and Firebase to initialize
    return new Promise((resolve) => setTimeout(resolve, 2000));
  });

  // Now click the button and trace what happens
  const googleBtn = page.locator('button:has-text("Google")');
  
  // Before clicking, inject a console log into the button's click handler
  // by monkey-patching the button's onclick
  await googleBtn.evaluate((btn) => {
    const origClick = btn.onclick;
    btn.onclick = (e) => {
      console.log('Google button onclick fired!');
      if (origClick) origClick.call(btn, e);
    };
    console.log('Button onclick hooked');
  });

  // Also hook the React event system
  await page.evaluate(() => {
    console.log('React event hooks would go here');
  });

  // Now click
  console.log('About to click Google button...');
  await googleBtn.click();
  console.log('Button clicked, waiting...');
  
  await page.waitForTimeout(5000);
  
  console.log('Final URL:', page.url());
  console.log('All logs:', logs);
});