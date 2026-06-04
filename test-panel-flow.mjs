import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let placesCalls = [];
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    const body = await resp.text();
    console.log(`→ ${resp.status()}:`, body.substring(0, 200));
    placesCalls.push(resp.url());
  }
});

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  // This opens Flow A (panelFlow)
  const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(500);

  // Check panelFlow is now 'step1'  
  const panelState = await page.evaluate(() => {
    // Look at URL hash or check visible panels
    const step1Visible = Array.from(document.querySelectorAll('div')).some(d => 
      d.textContent === '起始點' && d.querySelector('input')
    );
    return { step1Visible };
  });
  console.log('Panel state:', panelState);

  const inputs = await page.$$('input');
  await inputs[0].click();
  await inputs[0].type('干諾道中', { delay: 60 });
  await page.waitForTimeout(3000);
  console.log('Calls after pickup:', placesCalls.length);

  // Click the suggestion
  const clicked = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    // Filter to only "干諾道中香港" - exact match
    const suggs = allDivs.filter(d => {
      const text = d.textContent || '';
      return text === '干諾道中香港';
    });
    console.log('Exact "干諾道中香港" divs:', suggs.length);
    if (suggs.length > 0) {
      suggs[0].click();
      return true;
    }
    return false;
  });
  console.log('Clicked:', clicked);
  await page.waitForTimeout(3000);
  console.log('Calls after click:', placesCalls.length);

  // Get input values
  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Input values:', vals);

  // Check if there's a coordinate hint showing
  const hasCoordHint = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('span'));
    return divs.some(d => d.textContent === '📍');
  });
  console.log('Has 📍 coord hint:', hasCoordHint);

} finally {
  await browser.close();
}
