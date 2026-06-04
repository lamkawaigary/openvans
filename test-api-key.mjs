import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://openvans.web.app', { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(3000);

// Check the API key and test directly
const keyInfo = await page.evaluate(() => {
  // Get the Google Maps API key from the script src
  const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
  const keyFromUrl = scripts.length > 0 ? scripts[0].src.match(/key=([^&]+)/) : null;
  
  // Check what's in the config
  return {
    keyFromUrl: keyFromUrl ? keyFromUrl[1] : null,
    googleMapsKeyExists: typeof google !== 'undefined',
  };
});
console.log('API Key info:', JSON.stringify(keyInfo));

// Test getPlacePredictions with more detailed error
const testResult = await page.evaluate(async () => {
  if (typeof google === 'undefined' || !google.maps.places.AutocompleteService) {
    return { error: 'service not available' };
  }
  
  const service = new google.maps.places.AutocompleteService();
  
  // Test 1: Basic request
  const result1 = await new Promise((resolve) => {
    service.getPlacePredictions(
      { input: '干諾道', includedRegionCodes: ['hk'] },
      (predictions, status) => {
        resolve({ 
          status, 
          statusText: google.maps.places.PlacesServiceStatus[status],
          predictions: predictions ? predictions.map(p => ({
            description: p.description,
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text
          })) : []
        });
      }
    );
  });
  return result1;
});
console.log('Test 1 - getPlacePredictions:', JSON.stringify(testResult, null, 2));

await browser.close();
