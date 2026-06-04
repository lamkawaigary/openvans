import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(5000);

// Click the fill button and see if sheet opens
const fillBtn = await page.$('div:has-text("填寫取件/送件地點")');
console.log('Fill button found:', !!fillBtn);

if (fillBtn) {
  await fillBtn.click();
  await page.waitForTimeout(1500);
  
  // Check for LocationSheet elements
  const hasOverlay = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    return allDivs.some(d => {
      const style = window.getComputedStyle(d);
      return style.zIndex === '500' && style.position === 'absolute';
    });
  });
  console.log('Has overlay with z-500:', hasOverlay);
  
  // Check for 起始點 text
  const hasStartPoint = await page.evaluate(() => {
    return document.body.innerText.includes('起始點');
  });
  console.log('Has 起始點:', hasStartPoint);
  
  // Check for any new divs that appeared
  const bodyText = await page.textContent('body');
  console.log('Body text:', bodyText.substring(0, 400));
  
  // Check if inputs are in DOM but hidden
  const inputCount = await page.evaluate(() => {
    return document.querySelectorAll('input').length;
  });
  console.log('Input count:', inputCount);
  
  // Check for any text input
  const inputInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(i => ({
      placeholder: i.placeholder,
      type: i.type,
      display: window.getComputedStyle(i).display,
      visibility: window.getComputedStyle(i).visibility,
    }));
  });
  console.log('Input info:', JSON.stringify(inputInfo, null, 2));
}

await browser.close();
