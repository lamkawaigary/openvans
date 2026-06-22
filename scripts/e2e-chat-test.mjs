// E2E Chat + Call UI Test (Phase 8) — browser-based
import { chromium } from 'playwright';

const APP_URL = 'https://openvan.vercel.app';
const RENTER_EMAIL = 'e2e-renter@openvans-test.hk';
const DRIVER_EMAIL = 'e2e-driver@openvans-test.hk';
const PASSWORD = 'E2ETest123!';
const RENTER_NAME = '測試乘客E2E';
const RENTER_PHONE = '+85298765432';
const DRIVER_NAME = '測試司機E2E';
const DRIVER_PHONE = '+85298765433';

const FIREBASE_AUTH_SCRIPT = `
window.firebaseAuth = async (email, password, isSignUp) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const auth = getAuth(app);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, email: cred.user.email, ok: true };
  } catch (e1) {
    if (isSignUp !== false) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        return { uid: cred.user.uid, email: cred.user.email, ok: true, created: true };
      } catch (e2) {
        return { uid: null, ok: false, error: e2.message };
      }
    }
    return { uid: null, ok: false, error: e1.message };
  }
};
window.firebaseUpdateProfile = async (data) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'no current user' };
  const db = getFirestore(app);
  await setDoc(doc(db, 'users', user.uid), data, { merge: true });
  return { ok: true, uid: user.uid };
};
window.firebaseCreateBooking = async (renterUid) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const db = getFirestore(app);
  const bookingId = 'e2e-test-' + Date.now();
  await setDoc(doc(db, 'bookings', bookingId), {
    renterId: renterUid, status: 'pending',
    pickupAddress: '中環 IFC', pickupLat: 22.2855, pickupLng: 114.1577,
    dropoffAddress: '觀塘碼頭', dropoffLat: 22.3107, dropoffLng: 114.2211,
    pickupTime: new Date(Date.now() + 86400000).toISOString(),
    vehicleTypeRequired: 'light', totalLoadCount: 3,
    loads: [{ type: 'medium', count: 3 }],
    createdAt: new Date().toISOString(),
    estimatedPrice: 250,
    statusHistory: [{ status: 'pending', at: new Date().toISOString(), by: renterUid }],
  });
  return { bookingId, ok: true };
};
window.firebaseAcceptBooking = async (bookingId, driverUid) => {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
  const { getFirestore, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
  const app = initializeApp({
    apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
    authDomain: 'opensystem-857b2.firebaseapp.com',
    projectId: 'opensystem-857b2',
    storageBucket: 'opensystem-857b2.firebasestorage.app',
    messagingSenderId: '828737485195',
    appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
  });
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user || user.uid !== driverUid) return { ok: false, error: 'auth mismatch' };
  const db = getFirestore(app);
  await updateDoc(doc(db, 'bookings', bookingId), {
    status: 'confirmed', driverId: driverUid,
    confirmedAt: new Date().toISOString(),
    statusHistory: [
      { status: 'pending', at: new Date(Date.now() - 60000).toISOString(), by: user.uid },
      { status: 'confirmed', at: new Date().toISOString(), by: user.uid },
    ],
  });
  return { ok: true };
};
`;

const results = { steps: [], errors: [] };
function record(step, ok, info) {
  results.steps.push({ step, ok, info });
  console.log(`${ok ? '✅' : '❌'} ${step}${info ? ' — ' + info : ''}`);
  if (!ok) results.errors.push(step);
}

async function setup(page, email, name, phone, role) {
  const result = await page.evaluate(async ([email, password, name, phone, role]) => {
    const authRes = await window.firebaseAuth(email, password, true);
    if (!authRes.ok) return { ok: false, error: 'auth failed: ' + authRes.error };
    const profileRes = await window.firebaseUpdateProfile({ name, phone, role, isActive: true, email });
    if (!profileRes.ok) return { ok: false, error: 'profile failed: ' + profileRes.error };
    return { ok: true, uid: profileRes.uid, email, created: authRes.created };
  }, [email, PASSWORD, name, phone, role]);
  if (!result.ok) throw new Error(`Setup ${email}: ${result.error}`);
  console.log(`[setup] ${email} (uid ${result.uid}${result.created ? ', CREATED' : ', existing'})`);
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const renterCtx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const driverCtx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const renterPage = await renterCtx.newPage();
  const driverPage = await driverCtx.newPage();

  console.log('[init] Loading app pages...');
  await renterPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await driverPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await renterPage.addScriptTag({ content: FIREBASE_AUTH_SCRIPT });
  await driverPage.addScriptTag({ content: FIREBASE_AUTH_SCRIPT });

  console.log('\n=== Setup ===');
  const renter = await setup(renterPage, RENTER_EMAIL, RENTER_NAME, RENTER_PHONE, 'renter');
  record('Setup renter user', true, renter.uid);
  const driver = await setup(driverPage, DRIVER_EMAIL, DRIVER_NAME, DRIVER_PHONE, 'driver');
  record('Setup driver user', true, driver.uid);

  console.log('\n=== Create booking ===');
  const bookingResult = await renterPage.evaluate(async ([renterUid]) => {
    return await window.firebaseCreateBooking(renterUid);
  }, [renter.uid]);
  if (!bookingResult.ok) { record('Create booking', false, bookingResult.error); process.exit(1); }
  const bookingId = bookingResult.bookingId;
  record('Create booking (pending)', true, bookingId);

  const acceptResult = await driverPage.evaluate(async ([bookingId, driverUid]) => {
    return await window.firebaseAcceptBooking(bookingId, driverUid);
  }, [bookingId, driver.uid]);
  if (!acceptResult.ok) { record('Driver accept booking', false, acceptResult.error); process.exit(1); }
  record('Driver accept booking (confirmed)', true);

  console.log('\n=== Renter flow ===');
  await renterPage.goto(`${APP_URL}/trips/${bookingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await renterPage.waitForTimeout(5000);
  console.log('  renter URL:', renterPage.url());
  
  const renterHasChatPanel = await renterPage.locator('text=對話').count() > 0;
  record('Renter sees ChatPanel', renterHasChatPanel);

  const phoneUnmasked = await renterPage.locator(`text=${DRIVER_PHONE}`).count() > 0 ||
                         await renterPage.locator(`text=+8529876`).count() > 0;
  record('Renter sees driver phone (UNMASKED)', phoneUnmasked, `expected ${DRIVER_PHONE}`);

  const renterHasCallBtn = await renterPage.locator(`a[href^="tel:"]`).count() > 0;
  record('Renter has tel: call button', renterHasCallBtn);

  const renterComposer = renterPage.locator('input[placeholder*="傳訊息"]');
  const renterHasComposer = await renterComposer.count() > 0;
  record('Renter composer visible', renterHasComposer);

  if (renterHasComposer) {
    await renterComposer.fill('Hi 司機！準備好喇嗎？');
    await renterPage.locator('button[aria-label="傳送"]').click();
    await renterPage.waitForTimeout(3000);
    const renterBubble = await renterPage.locator('text=Hi 司機！準備好喇嗎？').count() > 0;
    record('Renter sent text message', renterBubble);
  }

  await renterPage.screenshot({ path: '/tmp/e2e-renter-1.png', fullPage: true });

  console.log('\n=== Driver flow ===');
  await driverPage.goto(`${APP_URL}/trips/${bookingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await driverPage.waitForTimeout(5000);
  console.log('  driver URL:', driverPage.url());

  const driverHasChatPanel = await driverPage.locator('text=對話').count() > 0;
  record('Driver sees ChatPanel', driverHasChatPanel);

  const driverPhoneUnmasked = await driverPage.locator(`text=${RENTER_PHONE}`).count() > 0 ||
                              await driverPage.locator(`text=+8529876`).count() > 0;
  record('Driver sees renter phone (UNMASKED)', driverPhoneUnmasked, `expected ${RENTER_PHONE}`);

  const driverHasCallBtn = await driverPage.locator(`a[href^="tel:"]`).count() > 0;
  record('Driver has tel: call button', driverHasCallBtn);

  await driverPage.waitForTimeout(3000);
  const driverSeesMessage = await driverPage.locator('text=Hi 司機！準備好喇嗎？').count() > 0;
  record('Driver received renter message (real-time)', driverSeesMessage);

  const driverComposer = driverPage.locator('input[placeholder*="傳訊息"]');
  if (await driverComposer.count() > 0) {
    await driverComposer.fill('收到！我 5 分鐘到');
    await driverPage.locator('button[aria-label="傳送"]').click();
    await driverPage.waitForTimeout(3000);
    const driverBubble = await driverPage.locator('text=收到！我 5 分鐘到').count() > 0;
    record('Driver sent reply', driverBubble);
  }

  await driverPage.screenshot({ path: '/tmp/e2e-driver-1.png', fullPage: true });

  await renterPage.waitForTimeout(3000);
  const renterSeesReply = await renterPage.locator('text=收到！我 5 分鐘到').count() > 0;
  record('Renter received driver reply (real-time)', renterSeesReply);

  await renterPage.screenshot({ path: '/tmp/e2e-renter-2.png', fullPage: true });
  await driverPage.screenshot({ path: '/tmp/e2e-driver-2.png', fullPage: true });

  await browser.close();

  console.log('\n═══════════════════════════════════');
  console.log(`Steps: ${results.steps.length} | Errors: ${results.errors.length}`);
  if (results.errors.length > 0) {
    console.log('Failed:', results.errors);
    process.exit(1);
  }
  console.log('🎉 All checks passed');
}

main().catch((e) => {
  console.error('FATAL:', e);
  console.log(`Steps: ${results.steps.length} | Errors: ${results.errors.length}`);
  process.exit(1);
});
