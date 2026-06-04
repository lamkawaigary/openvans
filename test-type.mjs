import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Click the button
const btn = page.getByText('填寫取件/送件地點 →');
await btn.click();
await page.waitForTimeout(1000);

// Get the inputs
const inputs = await page.$$('input');
console.log('Input count:', inputs.length);

if (inputs.length >= 2) {
  // Type in the pickup input
  await inputs[0].click();
  await inputs[0].type('干諾道', { delay: 100 });
  console.log('Typed in pickup input');
  
  await page.waitForTimeout(1500);
  
  // Check for suggestion dropdown
  const dropdownInfo = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    // Find suggestion dropdown
    const suggestions = allDivs.filter(d => {
      const text = d.textContent || '';
      return text.includes('干諾道') && text.length < 200 && !text.includes('下一步');
    });
    return suggestions.slice(0, 5).map(d => ({
      text: d.textContent?.substring(0, 100),
      html: d.outerHTML.substring(0, 300),
    }));
  });
  console.log('Suggestions:', JSON.stringify(dropdownInfo, null, 2));
  
  // Check the body text again
  const bodyText = await page.textContent('body');
  console.log('Has 干諾道 in body:', bodyText.includes('干諾道'));
  
  // Check for any new suggestions div  
  const hasSuggestions = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    return allDivs.some(d => {
      const text = d.textContent || '';
      return text.length > 3 && text.length < 200 && text.includes('干諾道') && d.children.length > 0;
    });
  });
  console.log('Has suggestion divs:', hasSuggestions);
}

await browser.close();
