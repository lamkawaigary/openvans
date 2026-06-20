const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Step 1: Navigating to Google Cloud Console API Keys...');
  await page.goto('https://console.cloud.google.com/apis/credentials?project=opensystem-857b2', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  console.log('Step 2: Looking for API Keys table and finding the Firebase key...');
  
  // Wait for the page to fully load
  await page.waitForSelector('table', { timeout: 10000 });
  
  // Find all table rows and look for the API key
  const keyRows = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const results = [];
    
    for (const table of tables) {
      const prevHeading = table.previousElementSibling?.textContent || '';
      if (prevHeading.includes('API Keys')) {
        const rows = table.querySelectorAll('tbody tr, tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            const firstCell = cells[0]?.textContent?.trim() || '';
            const secondCell = cells[1]?.textContent?.trim() || '';
            results.push({
              name: firstCell,
              restriction: secondCell,
              element: row
            });
          }
        }
      }
    }
    return results;
  });
  
  console.log('Found API keys:');
  keyRows.forEach((k, i) => console.log(`${i}: ${k.name} - ${k.restriction}`));
  
  // Find the row with AIzaSy (Firebase API key)
  const firebaseKeyRow = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const prevHeading = table.previousElementSibling?.textContent || '';
      if (prevHeading.includes('API Keys')) {
        const rows = table.querySelectorAll('tbody tr, tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          for (const cell of cells) {
            if (cell.textContent?.includes('AIzaSy')) {
              return row;
            }
          }
        }
      }
    }
    return null;
  });
  
  if (firebaseKeyRow) {
    console.log('Step 3: Found Firebase API key, clicking on it...');
    
    // Click on the row to open the key details
    await firebaseKeyRow.click();
    await page.waitForTimeout(3000);
    
    console.log('Step 4: Looking for application restrictions dropdown...');
    
    // Look for the application restrictions section
    const restrictionInfo = await page.evaluate(() => {
      // Search for any element mentioning "application restrictions" or "HTTP referrers"
      const allElements = document.querySelectorAll('*');
      const results = [];
      
      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.includes('Application restrictions') || text.includes('HTTP referrers') || text.includes('Website restrictions')) {
          results.push({
            tag: el.tagName,
            text: text.substring(0, 100)
          });
        }
      }
      return results;
    });
    
    console.log('Restriction elements found:', restrictionInfo.length);
    restrictionInfo.forEach((r, i) => console.log(`${i}: ${r.tag} - ${r.text.substring(0, 80)}`));
    
    // Try to find and click the restrictions dropdown
    // Look for select elements or dropdowns
    const dropdowns = await page.locator('select, [role="combobox"], [aria-label*="restriction"]').all();
    console.log(`Found ${dropdowns.length} dropdown/select elements`);
    
    // Try clicking on "None" option for application restrictions
    // The option should be to set restrictions to "None"
    try {
      // Look for any select element
      const selectElement = await page.locator('select').first();
      if (await selectElement.isVisible({ timeout: 2000 })) {
        console.log('Found select element, selecting "None" option...');
        await selectElement.selectOption({ index: 0 }); // Usually first option is None/Don't restrict
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Select element not found or not visible');
    }
    
    // Take screenshot to see current state
    await page.screenshot({ path: '/tmp/api_key_state.png', fullPage: true });
    console.log('Screenshot saved to /tmp/api_key_state.png');
    
    // Try to find any "None" or "Don't restrict" radio button or option
    const noneOption = await page.locator('text="None"').first();
    if (await noneOption.isVisible({ timeout: 2000 })) {
      console.log('Found None option, clicking...');
      await noneOption.click();
      await page.waitForTimeout(2000);
    }
    
    // Try to find and click Save button
    console.log('Step 5: Looking for Save button...');
    const saveButton = await page.locator('button:has-text("Save"), button:has-text("儲存"), button:has-text("Update")').first();
    if (await saveButton.isVisible({ timeout: 2000 })) {
      console.log('Found Save button, clicking...');
      await saveButton.click();
      await page.waitForTimeout(3000);
      console.log('API Key settings saved!');
    } else {
      console.log('Save button not found - taking screenshot for manual review');
    }
    
  } else {
    console.log('Firebase API key not found in the table');
  }
  
  await page.screenshot({ path: '/tmp/api_key_final.png', fullPage: true });
  console.log('Final screenshot saved');
  
  await browser.close();
  console.log('Done!');
})();
