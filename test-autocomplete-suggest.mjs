import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(3000);

// Check AutocompleteSuggestion methods
const methods = await page.evaluate(() => {
  if (typeof google === 'undefined' || !google.maps.places.AutocompleteSuggestion) return 'not available';
  const proto = google.maps.places.AutocompleteSuggestion.prototype;
  return proto ? Object.getOwnPropertyNames(proto).filter(n => typeof proto[n] === 'function') : 'no prototype';
});
console.log('AutocompleteSuggestion methods:', methods);

// Check static/class methods
const staticMethods = await page.evaluate(() => {
  if (typeof google === 'undefined' || !google.maps.places.AutocompleteSuggestion) return 'not available';
  return Object.getOwnPropertyNames(google.maps.places.AutocompleteSuggestion).filter(n => typeof google.maps.places.AutocompleteSuggestion[n] === 'function');
});
console.log('AutocompleteSuggestion static methods:', staticMethods);

// Try creating an instance and calling suggest
const testSuggest = await page.evaluate(async () => {
  const Ac = google.maps.places.AutocompleteSuggestion;
  const instance = new Ac();
  // List all properties
  const props = [];
  for (const key in instance) {
    props.push(key);
  }
  return { props };
});
console.log('AutocompleteSuggestion instance properties:', testSuggest);

await browser.close();
