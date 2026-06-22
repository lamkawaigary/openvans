import { chromium } from 'playwright';

const FB_CFG = {
  apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
  authDomain: 'opensystem-857b2.firebaseapp.com',
  projectId: 'opensystem-857b2',
  storageBucket: 'opensystem-857b2.firebasestorage.app',
  messagingSenderId: '828737485195',
  appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
};
const CFG_STR = JSON.stringify(FB_CFG);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) console.log(`[${msg.type()}]`, msg.text().substring(0, 250));
});
page.on('pageerror', (err) => console.log('[pageerror]', err.message.substring(0, 250)));

await page.goto('https://openvan.vercel.app', { waitUntil: 'domcontentloaded' });

const helperScript = `
window.signIn = async (email, password) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
  const app = initializeApp(${CFG_STR});
  const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
  return { uid: cred.user.uid };
};
window.readMessages = async (id) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const db = getFirestore(initializeApp(${CFG_STR}));
  const snap = await getDocs(collection(db, 'bookings', id, 'messages'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
window.listBookings = async (renterUid) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const db = getFirestore(initializeApp(${CFG_STR}));
  const q = query(collection(db, 'bookings'), where('renterId', '==', renterUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
`;
await page.addScriptTag({ content: helperScript });

const auth = await page.evaluate(async () => await window.signIn('e2e-renter@openvans-test.hk', 'E2ETest123!'));
console.log('auth:', auth);

const renterUid = auth.uid;
const bookings = await page.evaluate(async (uid) => await window.listBookings(uid), renterUid);
console.log('bookings:', bookings.length);
const b = bookings.find((bk) => bk.status === 'confirmed');
console.log('using:', b?.id, 'status:', b?.status, 'driverPhone:', b?.driverPhone);

await page.goto(`https://openvan.vercel.app/trips/${b.id}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

const composer = page.locator('input[placeholder*="傳訊息"]');
const sendBtn = page.locator('button[aria-label="傳送"]');
console.log('composer:', await composer.count(), 'sendBtn:', await sendBtn.count());

if ((await composer.count()) > 0 && (await sendBtn.count()) > 0) {
  console.log('--- sending ---');
  await composer.fill('Test debug msg');
  await sendBtn.click();
  await page.waitForTimeout(4000);
  const msgs = await page.evaluate(async (id) => await window.readMessages(id), b.id);
  console.log('messages after send:', msgs.length);
  msgs.forEach((m) => console.log(`  - [${m.senderRole}] ${m.text || '(image)'} ${m.createdAt}`));
}

await page.screenshot({ path: '/tmp/debug-msg.png', fullPage: true });
await browser.close();