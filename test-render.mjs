import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Check if this is a logged-in user view or login view
const authState = await page.evaluate(() => {
  // Look for login form elements
  const hasLoginForm = document.body.innerText.includes('登入') && 
    (document.body.innerText.includes('密碼') || document.body.innerText.includes('password') || document.body.innerText.includes('電話'));
  const hasHomeContent = document.body.innerText.includes('選擇上車地點');
  return { hasLoginForm, hasHomeContent };
});
console.log('Auth state:', JSON.stringify(authState));

// Look for the actual step indicator HTML
const stepHtml = await page.evaluate(() => {
  const allDivs = Array.from(document.querySelectorAll('div'));
  for (const div of allDivs) {
    const text = div.textContent || '';
    if (text.includes('✓路線') && text.includes('路線') && text.length < 100) {
      return div.outerHTML.substring(0, 600);
    }
  }
  return null;
});
console.log('Step HTML:', stepHtml);

// Get the full root div HTML
const rootHtml = await page.evaluate(() => {
  const root = document.getElementById('root');
  return root ? root.innerHTML.substring(0, 3000) : 'no root';
});
console.log('Root HTML:', rootHtml);

await browser.close();
