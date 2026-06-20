const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to Google Cloud Console API Keys...');
  await page.goto('https://console.cloud.google.com/apis/credentials?project=opensystem-857b2', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  console.log('Looking for API Keys table...');
  
  // Get all text content to find the keys
  const content = await page.evaluate(() => {
    // Find the API Keys table
    const tables = document.querySelectorAll('table');
    const results = [];
    
    for (const table of tables) {
      const heading = table.previousElementSibling?.textContent || '';
      if (heading.includes('API Keys')) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          const rowData = [];
          for (const cell of cells) {
            rowData.push(cell.textContent?.trim() || '');
          }
          if (rowData.length > 0) {
            results.push(rowData.join(' | '));
          }
        }
      }
    }
    return results;
  });
  
  console.log('API Keys table contents:');
  content.forEach(row => console.log(row));
  
  // Try to find the key with restrictions
  const keyInfo = await page.evaluate(() => {
    // Look for the Firebase API key (starts with AIzaSy)
    const keys = document.querySelectorAll('table tr');
    const results = [];
    
    for (const key of keys) {
      const text = key.textContent || '';
      if (text.includes('AIzaSy') || text.includes('Browser key') || text.includes('API key')) {
        results.push(text.substring(0, 500));
      }
    }
    return results;
  });
  
  console.log('\nKey information found:');
  keyInfo.forEach(k => console.log(k));
  
  await page.screenshot({ path: '/tmp/gcp_api_keys_check.png', fullPage: true });
  console.log('\nScreenshot saved');
  
  await browser.close();
})();
