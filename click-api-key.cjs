const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to API Keys page...');
  await page.goto('https://console.cloud.google.com/apis/credentials?project=opensystem-857b2', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(10000);
  
  console.log('Looking for API key rows...');
  
  // Try multiple approaches to find and click the API key
  const result = await page.evaluate(() => {
    // Deep search through shadow DOMs
    function searchAndClick(root, depth = 0) {
      if (depth > 20) return { success: false, message: 'max depth' };
      
      // Find tables
      const tables = root.querySelectorAll ? root.querySelectorAll('table') : [];
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          for (const cell of cells) {
            if (cell.textContent?.includes('AIzaSy')) {
              // Found the key! Try to click the row
              row.click();
              return { success: true, message: 'clicked row', key: cell.textContent.substring(0, 50) };
            }
          }
          // Also check for key name in first cell
          const firstCell = cells[0]?.textContent?.trim() || '';
          if (firstCell.includes('Browser') || firstCell.includes('API key')) {
            row.click();
            return { success: true, message: 'clicked browser key row', name: firstCell };
          }
        }
      }
      
      // Check shadow roots
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of elements) {
        if (el.shadowRoot) {
          const result = searchAndClick(el.shadowRoot, depth + 1);
          if (result.success) return result;
        }
      }
      
      return { success: false, message: 'not found at depth ' + depth };
    }
    
    return searchAndClick(document.body);
  });
  
  console.log('Result:', JSON.stringify(result));
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/clicked_key.png', fullPage: true });
  console.log('Screenshot saved');
  
  await browser.close();
})();
