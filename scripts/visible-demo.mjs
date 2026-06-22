// Visible browser demo v8 — production login + hardcoded booking ID
import { chromium } from 'playwright';

const APP_URL = 'https://openvan.vercel.app';
const RENTER_EMAIL = 'e2e-renter@openvans-test.hk';
const PASSWORD = 'E2ETest123!';
const FB_CFG = {
  apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
  authDomain: 'opensystem-857b2.firebaseapp.com',
  projectId: 'opensystem-857b2',
  storageBucket: 'opensystem-857b2.firebasestorage.app',
  messagingSenderId: '828737485195',
  appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
};

// Get latest live-* booking id from firestore (headless call before visible)
const setupBrowser = await chromium.launch({ headless: true });
const setupPage = await setupBrowser.newPage();
await setupPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
await setupPage.waitForTimeout(2000);

async function fbOp(p, fn, args = []) {
  return await p.evaluate(
    async ({ cfg, fn, args }) => {
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
      const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
      const { getAuth, signInWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
      if (!getApps().length) initializeApp(cfg);
      const a = getAuth();
      if (fn === 'signIn') { const c = await signInWithEmailAndPassword(a, args[0], args[1]); return { uid: c.user.uid }; }
      if (fn === 'signOut') { await signOut(a); return {}; }
      if (fn === 'getLatest') {
        const u = a.currentUser;
        if (!u) return { error: 'no user' };
        const q = query(collection(getFirestore(), 'bookings'), where('renterId', '==', u.uid));
        const snap = await getDocs(q);
        const confirmed = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => b.status === 'confirmed' && b.driverPhone).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return { bookingId: confirmed[0]?.id || null };
      }
      return {};
    },
    { cfg: FB_CFG, fn, args },
  );
}

console.log('--- Setup: ensure fresh booking exists ---');
await fbOp(setupPage, 'signIn', ['e2e-renter@openvans-test.hk', PASSWORD]);
const setupRes = await fbOp(setupPage, 'getLatest');
console.log('existing latest:', setupRes);
await setupBrowser.close();

const visibleBrowser = await chromium.launch({ headless: false });
const ctx = await visibleBrowser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', err.message.substring(0, 250)));

console.log('\n[1/4] Open production login page...');
await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

console.log('[2/4] Login as renter (production form)...');
await page.locator('input[type="email"]').first().fill(RENTER_EMAIL);
await page.locator('input[type="password"]').first().fill(PASSWORD);
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(8000);
console.log('  URL:', page.url());

// Hardcode the latest booking id we know exists from setup
// (Headless query confirmed above; we can also use the live-* prefix)
const headless = await chromium.launch({ headless: true });
const hp = await headless.newPage();
await hp.goto(APP_URL, { waitUntil: 'domcontentloaded' });
await hp.waitForTimeout(2000);
const latest = await fbOp(hp, 'signIn', ['e2e-renter@openvans-test.hk', PASSWORD]).then(() => fbOp(hp, 'getLatest'));
await headless.close();
console.log('  latest booking (live-*:', latest.bookingId, ')');

if (!latest.bookingId) {
  console.log('[!] No booking found');
  await page.waitForTimeout(600000);
  await visibleBrowser.close();
  process.exit(0);
}

console.log('[3/4] Navigate to trip detail...');
await page.goto(`${APP_URL}/trips/${latest.bookingId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);
console.log('  trip URL:', page.url());

console.log('[4/4] Send 3 demo messages via UI...');
const composer = page.locator('input[placeholder*="傳訊息"]');
if ((await composer.count()) > 0) {
  await composer.fill('Hi 司機！我 5 分鐘後到 IFC 等你');
  await page.locator('button[aria-label="傳送"]').click();
  await page.waitForTimeout(2000);
  await composer.fill('對了，我件貨有 3 箱，麻煩你帶多個架');
  await page.locator('button[aria-label="傳送"]').click();
  await page.waitForTimeout(2000);
  await composer.fill('📞 麻煩 5 分鐘內回覆');
  await page.locator('button[aria-label="傳送"]').click();
  await page.waitForTimeout(3000);
  console.log('  3 messages sent');
} else {
  console.log('  composer not found');
}

console.log('\n🟢 BROWSER WILL STAY OPEN FOR 10 MINUTES');
console.log(`   Booking: ${latest.bookingId}`);
console.log(`   URL: ${APP_URL}/trips/${latest.bookingId}`);
await page.waitForTimeout(600000);

await visibleBrowser.close();