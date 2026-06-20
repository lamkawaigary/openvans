const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to API Keys page...');
  await page.goto('https://console.cloud.google.com/apis/credentials?project=opensystem-857b2', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(8000);
  
  console.log('Searching for API key rows in shadow DOM...');
  
  // Deep search through shadow DOM to find API key
  const result = await page.evaluate(async () => {
    // Function to recursively search through shadow DOMs
    async function searchShadowRoots(root, depth = 0, maxDepth = 15) {
      if (depth > maxDepth) return { found: false };
      
      // Check for rows in tables
      const tables = root.querySelectorAll ? root.querySelectorAll('table') : [];
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          for (const cell of cells) {
            if (cell.textContent?.includes('AIzaSy')) {
              // Found the API key row
              return {
                found: true,
                rowHTML: row.outerHTML.substring(0, 500),
                rowText: row.textContent?.substring(0, 300)
              };
            }
          }
        }
      }
      
      // Check shadow roots
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      for (const el of elements) {
        if (el.shadowRoot) {
          const result = await searchShadowRoots(el.shadowRoot, depth + 1, maxDepth);
          if (result.found) return result;
        }
      }
      
      return { found: false };
    }
    
    return await searchShadowRoots(document.body);
  });
  
  console.log('Search result:', JSON.stringify(result, null, 2));
  
  // Try to click on the API key row if found
  if (result.found) {
    console.log('Found API key row, attempting to click...');
    
    // Use JavaScript to find and click the row
    const clicked = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          for (const cell of cells) {
            if (cell.textContent?.includes('AIzaSy')) {
              row.click();
              return true;
            }
          }
        }
      }
      return false;
    });
    
    console.log('Click result:', clicked);
    await page.waitForTimeout(3000);
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/shadow_search.png', fullPage: true });
  console.log('Screenshot saved');
  
  await browser.close();
})();
