import { test, expect } from '@playwright/test';

const BASE = 'https://openvan.vercel.app';

test('Login page loads without Firebase errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // Check page title / main elements exist
  await expect(page.locator('text=openvan')).toBeVisible();
  await expect(page.locator('text=登入')).toBeVisible();

  // Check Google button exists
  const googleBtn = page.locator('button:has-text("Google")');
  await expect(googleBtn).toBeVisible();

  // Filter out benign errors
  const realErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('Failed to load resource') &&
    !e.includes('net::ERR')
  );

  console.log('Console errors:', realErrors);
  expect(realErrors).toHaveLength(0);
});

test('Email login form works', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // Fill in login form
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', 'password123');

  // Submit
  await page.click('button[type="submit"]');

  // Wait a bit for Firebase response
  await page.waitForTimeout(3000);

  const realErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('Failed to load resource') &&
    !e.includes('net::ERR')
  );

  console.log('Email login errors:', realErrors);

  // Should show some error about invalid credentials (expected for test@test.com)
  // But NOT Firebase initialization errors
  const firebaseInitErrors = realErrors.filter(e => e.includes('Firebase') || e.includes('auth/'));
  expect(firebaseInitErrors).toHaveLength(0);
});

test('Google login button is clickable and triggers auth', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  const googleBtn = page.locator('button:has-text("Google")');
  await googleBtn.click();

  // Wait for popup or redirect
  await page.waitForTimeout(2000);

  const realErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('Failed to load resource') &&
    !e.includes('net::ERR')
  );

  console.log('Google button click errors:', realErrors);

  // No Firebase initialization errors
  const firebaseInitErrors = realErrors.filter(e =>
    e.includes('Firebase') ||
    e.includes('auth/') ||
    e.includes('apiKey')
  );
  expect(firebaseInitErrors).toHaveLength(0);
});