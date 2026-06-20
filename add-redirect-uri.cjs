const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the OAuth client page
  await page.goto('https://console.cloud.google.com/apis/credentials/oauthclient/828737485195-htpq808i9s4okn0geufkrcva7j859n4a.apps.googleusercontent.com?project=opensystem-857b2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  console.log('Page loaded, looking for Add URI button...');
  
  // Try to find and click Add URI button using JavaScript
  const result = await page.evaluate(() => {
    // Deep search through shadow DOMs
    function findInShadowRoots(element, depth = 0) {
      if (depth > 5) return null;
      if (element.shadowRoot) {
        const found = findInShadowRoots(element.shadowRoot, depth + 1);
        if (found) return found;
      }
      for (const child of element.children || element.childNodes || []) {
        // Check button
        if (child.tagName === 'BUTTON' || child.tagName === 'PAPER-BUTTON') {
          const text = child.textContent?.trim() || '';
          if (text.includes('Add URI') && text.includes('Redirect')) {
            return child;
          }
        }
        // Recurse into shadow root
        if (child.shadowRoot) {
          const found = findInShadowRoots(child, depth + 1);
          if (found) return found;
        }
        // Recurse into children
        const found = findInShadowRoots(child, depth + 1);
        if (found) return found;
      }
      return null;
    }
    
    // Try document body
    let btn = findInShadowRoots(document.body);
    if (btn) return { found: 'shadow', text: btn.textContent?.trim() };
    
    // Try all buttons with text matching
    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const b of buttons) {
      const text = b.textContent?.trim() || '';
      if (text.includes('Add URI') && text.includes('Redirect')) {
        return { found: 'button', text };
      }
    }
    
    // Try finding by traversing all elements
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        const btns = el.shadowRoot.querySelectorAll('button');
        for (const b of btns) {
          const text = b.textContent?.trim() || '';
          if (text.includes('Add URI') && text.includes('Redirect')) {
            return { found: 'shadow-btn', text };
          }
        }
      }
    }
    
    return { found: 'not-found' };
  });
  
  console.log('Search result:', JSON.stringify(result));
  
  if (result.found) {
    // Try clicking using Playwright
    try {
      const addBtn = page.locator(`button:has-text("Add URI"):has-text("Redirect")`).first();
      if (await addBtn.isVisible({ timeout: 2000 })) {
        await addBtn.click({ force: true });
        console.log('Clicked Add URI button via Playwright');
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('Playwright click failed:', e.message);
    }
  }
  
  await page.screenshot({ path: '/tmp/playwright_state.png' });
  
  // Now try to find the URI input field
  // Look for any input in the redirect URIs section
  const uriInputResult = await page.evaluate(() => {
    // Find all inputs
    const inputs = document.querySelectorAll('input, textarea');
    const results = [];
    for (const input of inputs) {
      results.push({
        tag: input.tagName,
        type: input.type,
        placeholder: input.placeholder,
        name: input.name,
        id: input.id,
        visible: input.offsetParent !== null
      });
    }
    return results;
  });
  
  console.log('Input fields found:', JSON.stringify(uriInputResult, null, 2));
  
  await browser.close();
})();
