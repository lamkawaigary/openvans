import { chromium } from 'playwright';
const FB_CFG = {
  apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
  authDomain: 'opensystem-857b2.firebaseapp.com',
  projectId: 'opensystem-857b2',
  storageBucket: 'opensystem-857b2.firebasestorage.app',
  messagingSenderId: '828737485195',
  appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
};

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text().substring(0, 250)));
page.on('pageerror', (err) => console.log('[pageerror]', err.message.substring(0, 250)));

await page.goto('https://openvan.vercel.app', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const result = await page.evaluate(async (cfg) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
  const app = initializeApp(cfg);
  try {
    const cred = await signInWithEmailAndPassword(getAuth(app), 'e2e-renter@openvans-test.hk', 'E2ETest123!');
    return { uid: cred.user.uid, ok: true };
  } catch (e) {
    return { ok: false, error: e.message, code: e.code };
  }
}, FB_CFG);
console.log('signIn result:', result);

// Keep browser open so Gary can manually try
console.log('\n🟢 Browser open for 5 min — try login manually at https://openvan.vercel.app/login');
console.log('   Email: e2e-renter@openvans-test.hk');
console.log('   Password: E2ETest123!');
await page.waitForTimeout(300000);

await browser.close();
