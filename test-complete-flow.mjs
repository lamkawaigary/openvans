import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
  const t = msg.text();
  if (t.includes('selectPickup') || t.includes('selectDropoff') || t.includes('OpenVans') || t.includes('getPlaceCoords')) {
    console.log(`[${msg.type()}] ${t}`);
  }
});

await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

// Open panel
await page.click('text=填寫取件/送件地點 →');
await page.waitForTimeout(500);

// Type pickup
const inp = await page.$('input[placeholder="起始點"]');
await inp.click();
await inp.type('干諾道中', { delay: 60 });
await page.waitForTimeout(4000);

// Click pickup suggestion
await page.click('div:has-text("干諾道中香港")');
await page.waitForTimeout(5000);

// Type dropoff
const inputs = await page.$$('input');
await inputs[1].click();
await inputs[1].type('旺角', { delay: 60 });
await page.waitForTimeout(4000);

// Click dropoff suggestion
await page.click('div:has-text("香港旺角")');
await page.waitForTimeout(5000);

// Check both inputs have correct values
const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => i.value));
console.log('Input values:', vals);

// Check both 📍 hints are present
const hints = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll('span'));
  return spans.filter(s => s.textContent === '📍').map(s => s.parentElement?.textContent);
});
console.log('Coord hints:', hints);

// Check if 下一步 is enabled
const nextBtn = await page.$('text=下一步');
const isClickable = nextBtn ? await nextBtn.isEnabled() : false;
console.log('Next button enabled:', isClickable);

// Click 下一步 to go to step 2
if (nextBtn) {
  await nextBtn.click();
  await page.waitForTimeout(3000);
  
  // Check step 2 content
  const body = await page.textContent('body');
  console.log('Has 里程費:', body.includes('里程費'));
  console.log('Has km:', body.includes('km'));
  console.log('Has 分鐘:', body.includes('分鐘'));
  console.log('Has HK$:', body.includes('HK$'));
  
  // Extract distance values
  const kmMatch = body.match(/(\d+\.?\d*)\s*km/);
  const minMatch = body.match(/(\d+)\s*分鐘/);
  const hkMatch = body.match(/HK\$(\d+)/);
  console.log('Distance:', kmMatch?.[1], 'km');
  console.log('Time:', minMatch?.[1], 'min');  
  console.log('Fare:', hkMatch?.[0]);
}

await browser.close();
console.log('Done');
