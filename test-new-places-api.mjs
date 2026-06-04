import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(3000);

const apiInfo = await page.evaluate(() => {
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    return 'google.maps.places not available';
  }
  
  const places = google.maps.places;
  const available = [];
  for (const key of Object.keys(places)) {
    available.push(key);
  }
  
  return {
    keys: available,
    hasAutocompleteService: typeof places.AutocompleteService !== 'undefined',
    hasAutocompleteSuggestion: typeof places.AutocompleteSuggestion !== 'undefined',
  };
});

console.log('Places API info:', JSON.stringify(apiInfo, null, 2));

await browser.close();
