import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Catch console logs
page.on('console', msg => console.log(`[browser ${msg.type()}]`, msg.text().substring(0, 200)));
page.on('pageerror', err => console.log(`[page error]`, err.message.substring(0, 200)));

await page.goto('https://openvan.vercel.app', { waitUntil: 'domcontentloaded' });

// Sign in via firebase
const FIREBASE_AUTH = `
window.signIn = async (email, password) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, email };
};
`;
await page.addScriptTag({ content: FIREBASE_AUTH });

const authRes = await page.evaluate(async () => {
  return await window.signIn('e2e-renter@openvans-test.hk', 'E2ETest123!');
});
console.log('auth result:', authRes);

await page.waitForTimeout(2000);

// Navigate to trip detail (need a real booking ID first)
const bookingId = 'e2e-test-1782138780487';
await page.goto(`https://openvan.vercel.app/trip/${bookingId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

// Where are we now?
console.log('current URL:', page.url());
console.log('page title:', await page.title());
const bodyText = await page.locator('body').textContent();
console.log('body excerpt:', bodyText?.substring(0, 500));

await page.screenshot({ path: '/tmp/debug-renter.png', fullPage: true });

await browser.close();
