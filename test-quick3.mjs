import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto('https://openvans.web.app', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);

  // Click the button to open location sheet
  const btn = await page.waitForSelector('text=填寫取件/送件地點 →', { timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(800);

  // Get all inputs on page
  const inputsBefore = await page.$$('input');
  console.log('Inputs count after opening sheet:', inputsBefore.length);
  for (let i = 0; i < inputsBefore.length; i++) {
    const ph = await inputsBefore[i].getAttribute('placeholder');
    console.log(`  Input ${i}: placeholder=${ph}, value=${await inputsBefore[i].inputValue()}`);
  }

  // Type pickup
  const pickupInput = inputsBefore[0];
  await pickupInput.click();
  await pickupInput.type('干諾道中', { delay: 60 });
  await page.waitForTimeout(2000);

  // Check for suggestions  
  const allDivs = await page.$$('div');
  const suggDivs = allDivs.filter(d => d.textContent === '干諾道中');
  console.log('Suggestion divs with "干諾道中":', suggDivs.length);
  
  // Click it
  if (suggDivs.length > 0) {
    await suggDivs[0].click();
    await page.waitForTimeout(2000);
  } else {
    console.log('No suggestion found to click');
  }

  // Get inputs after click
  const inputsAfter = await page.$$('input');
  console.log('Inputs after pickup select:', inputsAfter.length);
  for (let i = 0; i < inputsAfter.length; i++) {
    const ph = await inputsAfter[i].getAttribute('placeholder');
    console.log(`  Input ${i}: placeholder=${ph}, value=${await inputsAfter[i].inputValue()}`);
  }

  // Type dropoff
  if (inputsAfter.length >= 2) {
    await inputsAfter[1].click();
    await inputsAfter[1].type('旺角', { delay: 60 });
    await page.waitForTimeout(2000);
    
    const suggDivs2 = await page.$$('div');
    const matching = suggDivs2.filter(d => d.textContent?.includes('旺角') && d.textContent !== '旺角');
    console.log('Dropoff suggestions:', matching.length);
    
    if (matching.length > 0) {
      await matching[0].click();
      await page.waitForTimeout(2000);
    }
  }

  // Check final state
  const finalInputs = await page.$$('input');
  console.log('Final inputs:', finalInputs.length);
  for (let i = 0; i < finalInputs.length; i++) {
    const ph = await finalInputs[i].getAttribute('placeholder');
    console.log(`  Input ${i}: placeholder=${ph}, value=${await finalInputs[i].inputValue()}`);
  }
  
  // Check for fare calculation
  const bodyText = await page.textContent('body');
  console.log('Body contains km:', bodyText.includes('km'));
  console.log('Body contains HK$:', bodyText.includes('HK$'));
  
} finally {
  await browser.close();
}
