import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const allLogs = [];
page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
page.on('pageerror', err => allLogs.push(`[CRASH] ${err.message.substring(0, 100)}`));

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Step 1: Open panel
  await page.click('text=填寫取件/送件地點 →');
  await page.waitForTimeout(400);

  // Step 2: Type pickup
  const inp = await page.$('input[placeholder="起始點"]');
  await inp.click();
  await inp.type('干諾道中', { delay: 60 });
  await page.waitForTimeout(3000);

  // Step 3: Click suggestion
  const suggestionDiv = await page.$('div:has-text("干諾道中香港")');
  console.log('Found suggestion:', !!suggestionDiv);
  if (suggestionDiv) {
    await suggestionDiv.click();
    console.log('Clicked suggestion');
    await page.waitForTimeout(3000);
  }

  // Step 4: Type dropoff  
  const inputs = await page.$$('input');
  console.log('Input count:', inputs.length);
  
  if (inputs.length >= 2) {
    await inputs[1].click();
    await inputs[1].type('旺角', { delay: 60 });
    await page.waitForTimeout(3000);

    const suggestionDiv2 = await page.$('div:has-text("旺角")');
    console.log('Found dropoff suggestion:', !!suggestionDiv2);
    if (suggestionDiv2) {
      await suggestionDiv2.click();
      console.log('Clicked dropoff');
      await page.waitForTimeout(3000);
    }
  }

  // Step 5: Check state
  const finalState = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return {
      inputValues: inputs.map(i => i.value),
      coordHints: Array.from(document.querySelectorAll('span')).map(s => s.textContent).filter(t => t === '📍'),
    };
  });
  console.log('Final state:', JSON.stringify(finalState));

  // Step 6: Click 下一步
  const nextBtn = await page.$('text=下一步');
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    
    const step2Body = await page.textContent('body');
    console.log('Step2 has km:', step2Body.includes('km'));
    console.log('Step2 has HK$:', step2Body.includes('HK$'));
    console.log('Step2 has 里程費:', step2Body.includes('里程費'));
  }

  // Print all OpenVans-related logs
  console.log('\n=== OpenVans Logs ===');
  allLogs.filter(l => l.includes('OpenVans') || l.includes('getPlace') || l.includes('AddressSearch')).forEach(l => console.log(l));

} catch(e) {
  console.log('Error:', e.message);
} finally {
  await browser.close();
}
