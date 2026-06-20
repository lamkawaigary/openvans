const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to credentials page...');
  await page.goto('https://console.cloud.google.com/apis/credentials?project=opensystem-857b2', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(10000);
  
  console.log('Looking for Browser key row...');
  
  // Try to find and click the "Browser key (auto created by Firebase)" row
  const result = await page.evaluate(() => {
    // Deep search through shadow DOMs
    function findAndClickRow(root, depth = 0) {
      if (depth > 25) return { success: false, message: 'max depth reached' };
      
      // Find tables
      const tables = root.querySelectorAll ? root.querySelectorAll('table') : [];
      for (const table of tables) {
        const prevText = table.previousElementSibling?.textContent || '';
        if (prevText.includes('API Keys')) {
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            for (const cell of cells) {
              const text = cell.textContent || '';
              if (text.includes('Browser key') || text.includes('Firebase')) {
                // Try clicking the row
                row.click();
                return { success: true, message: 'clicked', text: text.substring(0, 100) };
              }
            }
          }
        }
      }
      
      // Check shadow roots
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of elements) {
        if (el.shadowRoot) {
          const result = findAndClickRow(el.shadowRoot, depth + 1);
          if (result.success) return result;
        }
      }
      
      return { success: false, message: 'not found at depth ' + depth };
    }
    
    return findAndClickRow(document.body);
  });
  
  console.log('Result:', JSON.stringify(result));
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/after_click_browser_key.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Check current URL
  console.log('Current URL:', page.url());
  
  await browser.close();
})();
