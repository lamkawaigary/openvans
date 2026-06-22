import { chromium } from 'playwright';

const APP_URL = 'https://openvan.vercel.app';
const RENTER_EMAIL = 'e2e-renter@openvans-test.hk';
const PASSWORD = 'E2ETest123!';
const RENTER_PHONE = '+85298765432';
const DRIVER_PHONE = '+85298765433';

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
  return { uid: cred.user.uid };
};
window.getBookings = async () => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const db = getFirestore(app);
  const q = query(collection(db, 'bookings'), where('renterId', '==', (await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js')).getAuth(app).currentUser.uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
window.getUser = async (uid) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};
window.listBookings = async () => {
  const bookings = await window.getBookings();
  return bookings.map(b => ({ id: b.id, status: b.status, driverId: b.driverId }));
};
window.readMessages = async (bookingId) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'bookings', bookingId, 'messages'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
page.on('console', msg => { if (msg.type() === 'error') console.log('[browser error]', msg.text().substring(0, 300)); });
page.on('pageerror', err => console.log('[page error]', err.message.substring(0, 300)));

await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
await page.addScriptTag({ content: FIREBASE_AUTH });

const auth = await page.evaluate(async () => {
  return await window.signIn('e2e-renter@openvans-test.hk', 'E2ETest123!');
});
console.log('auth:', auth);

// Get bookings
const bookings = await page.evaluate(async () => await window.listBookings());
console.log('bookings:', bookings);

if (bookings.length === 0) {
  console.log('NO BOOKINGS — exiting');
  process.exit(1);
}

const bookingId = bookings[bookings.length - 1].id;
console.log('using bookingId:', bookingId);

// Get driver user doc
const booking = await page.evaluate(async (id) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, 'bookings', id));
  return snap.exists() ? snap.data() : null;
}, bookingId);
console.log('booking data:', JSON.stringify({ status: booking?.status, renterId: booking?.renterId, driverId: booking?.driverId }, null, 2));

if (booking?.driverId) {
  const driverUser = await page.evaluate(async (uid) => await window.getUser(uid), booking.driverId);
  console.log('driver user:', JSON.stringify({ name: driverUser?.name, phone: driverUser?.phone, role: driverUser?.role }, null, 2));
}

// Navigate to trip detail
await page.goto(`${APP_URL}/trips/${bookingId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);
console.log('URL:', page.url());

// Get all phone text
const phoneElements = await page.locator('a[href^="tel:"]').all();
console.log(`tel: links: ${phoneElements.length}`);
for (const a of phoneElements) {
  const href = await a.getAttribute('href');
  const text = await a.textContent();
  console.log(`  href=${href} text=${JSON.stringify(text)}`);
}

// Look for masked phone
const bodyText = await page.locator('body').textContent();
const phoneMatches = bodyText.match(/\+852\s*[\d\s*]+/g);
console.log('phone matches in body:', phoneMatches);

// Try sending a message via UI
const composer = page.locator('input[placeholder*="傳訊息"]');
console.log('composer count:', await composer.count());
if (await composer.count() > 0) {
  await composer.fill('Debug test message');
  await page.locator('button[aria-label="傳送"]').click();
  await page.waitForTimeout(3000);
  console.log('after send, body excerpt:', (await page.locator('body').textContent()).substring(0, 800));
  
  // Read messages
  const msgs = await page.evaluate(async (id) => await window.readMessages(id), bookingId);
  console.log('messages in db:', msgs.length);
  msgs.forEach(m => console.log(`  - [${m.senderRole}] ${m.text || '(image)'} createdAt=${m.createdAt}`));
}

await page.screenshot({ path: '/tmp/debug-renter-2.png', fullPage: true });

await browser.close();
