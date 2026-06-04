import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let placesCalls = [];
page.on('response', async resp => {
  if (resp.url().includes('places.googleapis.com')) {
    const body = await resp.text();
    console.log(`→ ${resp.request().method()} ${resp.status()} ${resp.url().includes('searchText') ? 'SEARCH' : 'DETAILS'}:`, body.substring(0, 150));
    placesCalls.push(resp.url());
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
  console.log('Calls after typing pickup:', placesCalls.length);

  // Click the suggestion
  const clicked = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const suggs = allDivs.filter(d => d.textContent === '干諾道中香港');
    if (suggs.length > 0) { suggs[0].click(); return true; }
    return false;
  });
  console.log('Clicked:', clicked, '| Calls so far:', placesCalls.length);
  await page.waitForTimeout(3000);
  console.log('Calls after waiting (getPlaceCoords):', placesCalls.length);

  // Type dropoff
  const inputs2 = await page.$$('input');
  await inputs2[1].click();
  await inputs2[1].type('旺角', { delay: 60 });
  await page.waitForTimeout(3000);
  console.log('Calls after typing dropoff:', placesCalls.length);

  // Click suggestion
  const clicked2 = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const suggs = allDivs.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
    console.log('Found旺角:', suggs.length, suggs.map(d => d.textContent));
    if (suggs.length > 0) { suggs[0].click(); return true; }
    return false;
  });
  console.log('Clicked2:', clicked2);
  await page.waitForTimeout(3000);
  console.log('Calls after dropoff click:', placesCalls.length);

  // Check inputs
  const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
  console.log('Final input values:', vals);

} finally {
  await browser.close();
}
