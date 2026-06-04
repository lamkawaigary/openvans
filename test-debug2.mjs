import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Intercept ALL responses
let allResponses = [];
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com') || resp.url().includes('firestore')) {
    try {
      const body = await resp.text();
      allResponses.push({ url: resp.url().substring(0, 150), status: resp.status(), body: body.substring(0, 200) });
    } catch {}
  }
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(500);

  const inputs = await page.$$('input');
  await inputs[0].click();
  await inputs[0].type('干諾道中', { delay: 60 });
  await page.waitForTimeout(3000);

  // Check for dropdown  
  const dropdownDivs = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    return allDivs
      .filter(d => {
        const style = d.getAttribute('style') || '';
        return style.includes('position') && style.includes('absolute');
      })
      .map(d => ({ text: d.textContent?.substring(0, 100), zIndex: d.style.zIndex }));
  });
  console.log('Absolute positioned divs:', dropdownDivs);
  
  // Get all divs that have any text matching the suggestion
  const allText = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    return allDivs
      .filter(d => d.textContent?.includes('干諾道'))
      .map(d => d.textContent?.substring(0, 100));
  });
  console.log('Divs with 干諾道:', allText);

  console.log('API responses:', allResponses.length, allResponses[0]?.body);

} finally {
  await browser.close();
}
