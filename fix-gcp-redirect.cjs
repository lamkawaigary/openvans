const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Step 1: Navigating to OAuth client page...');
  await page.goto('https://console.cloud.google.com/apis/credentials/oauthclient/828737485195-htpq808i9s4okn0geufkrcva7j859n4a.apps.googleusercontent.com?project=opensystem-857b2', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  console.log('Step 2: Looking for redirect URIs section...');
  
  // Method 1: Try to find the "Authorized redirect URIs" section and add URI button
  // The button text is "+ Add URI" in English
  const addUriSelectors = [
    'button:has-text("Add URI")',
    'button:has-text("+ Add URI")',
    '[aria-label*="Add URI"]',
    '[aria-label*="add uri"]',
    'tp-yt-paper-button:has-text("Add URI")',
    'gcp-paper-button:has-text("Add URI")'
  ];
  
  for (const selector of addUriSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        console.log(`Found button with selector: ${selector}`);
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    } catch (e) {}
  }
  
  // Method 2: Search in iframes
  console.log('Step 3: Searching in iframes...');
  const frames = page.frames();
  console.log(`Found ${frames.length} frames`);
  
  for (const frame of frames) {
    try {
      const frameTitle = await frame.title().catch(() => '');
      console.log(`Frame: ${frameTitle}`);
      
      // Try to find Add URI button in this frame
      for (const selector of addUriSelectors) {
        try {
          const btn = frame.locator(selector).first();
          if (await btn.isVisible({ timeout: 1000 })) {
            console.log(`Found button in frame "${frameTitle}" with selector: ${selector}`);
            await btn.click();
            await page.waitForTimeout(2000);
            break;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log(`Error accessing frame: ${e.message}`);
    }
  }
  
  // Method 3: Use JavaScript to traverse shadow DOM
  console.log('Step 4: Traversing shadow DOM...');
  const shadowResult = await page.evaluate(() => {
    function findAddUriButton(root, depth = 0) {
      if (depth > 10) return null;
      
      // Check buttons directly
      const buttons = root.querySelectorAll ? root.querySelectorAll('button') : [];
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text.includes('Add URI')) {
          return { type: 'button', text, foundIn: 'root' };
        }
      }
      
      // Check shadow roots
      const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of allElements) {
        if (el.shadowRoot) {
          const result = findAddUriButton(el.shadowRoot, depth + 1);
          if (result) return { ...result, foundIn: `shadow:${el.tagName}` };
        }
      }
      
      return null;
    }
    
    return findAddUriButton(document.body);
  });
  
  console.log('Shadow DOM search result:', JSON.stringify(shadowResult));
  
  // Take final screenshot
  await page.screenshot({ path: '/tmp/playwright_final_gcp.png', fullPage: true });
  console.log('Screenshot saved to /tmp/playwright_final_gcp.png');
  
  await browser.close();
  console.log('Done!');
})();
