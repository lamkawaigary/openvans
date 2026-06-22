// Quick setup: ensure fresh booking with denormalized driver phone exists
import { chromium } from 'playwright';
const FB_CFG = {
  apiKey: 'AIzaSyCdnIS5AfQZTf6iQcD0gh1jHFqcJ6CX9LU',
  authDomain: 'opensystem-857b2.firebaseapp.com',
  projectId: 'opensystem-857b2',
  storageBucket: 'opensystem-857b2.firebasestorage.app',
  messagingSenderId: '828737485195',
  appId: '1:828737485195:web:86d8fa39942d3a7dabd78e',
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://openvan.vercel.app', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

const op = async (fn, args = []) =>
  await page.evaluate(async ({ cfg, fn, args }) => {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js');
    const app = initializeApp(cfg);
    const { getAuth, signInWithEmailAndPassword, signOut } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');
    const { getFirestore, doc, setDoc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js');
    const a = getAuth(app);
    if (fn === 'signIn') { const c = await signInWithEmailAndPassword(a, args[0], args[1]); return { uid: c.user.uid }; }
    if (fn === 'signOut') { await signOut(a); return {}; }
    if (fn === 'updateProfile') { await setDoc(doc(getFirestore(app), 'users', a.currentUser.uid), args[0], { merge: true }); return { uid: a.currentUser.uid }; }
    if (fn === 'createBooking') {
      const db = getFirestore(app); const [renterUid] = args;
      let renterName, renterPhone;
      try { const s = await getDoc(doc(db, 'users', renterUid)); if (s.exists()) { renterName = s.data().name; renterPhone = s.data().phone; } } catch {}
      const id = 'live-' + Date.now();
      await setDoc(doc(db, 'bookings', id), { renterId: renterUid, status: 'pending', renterName, renterPhone, pickupAddress: '中環 IFC', pickupLat: 22.2855, pickupLng: 114.1577, dropoffAddress: '觀塘碼頭', dropoffLat: 22.3107, dropoffLng: 114.2211, pickupTime: new Date(Date.now() + 86400000).toISOString(), vehicleTypeRequired: 'light', totalLoadCount: 3, loads: [{ type: 'medium', count: 3 }], createdAt: new Date().toISOString(), estimatedPrice: 250, statusHistory: [{ status: 'pending', at: new Date().toISOString(), by: renterUid }] });
      return { bookingId: id };
    }
    if (fn === 'acceptBooking') {
      const db = getFirestore(app); const [bid, did] = args;
      let dn, dp;
      try { const s = await getDoc(doc(db, 'users', did)); if (s.exists()) { dn = s.data().name; dp = s.data().phone; } } catch {}
      await updateDoc(doc(db, 'bookings', bid), { status: 'confirmed', driverId: did, confirmedAt: new Date().toISOString(), driverName: dn, driverPhone: dp, statusHistory: [{ status: 'pending', at: new Date(Date.now() - 60000).toISOString(), by: did }, { status: 'confirmed', at: new Date().toISOString(), by: did }] });
      return { ok: true };
    }
    return {};
  }, { cfg: FB_CFG, fn, args });

const r = await op('signIn', ['e2e-renter@openvans-test.hk', 'E2ETest123!']);
console.log('renter:', r);
await op('signOut');
const d = await op('signIn', ['e2e-driver@openvans-test.hk', 'E2ETest123!']);
console.log('driver:', d);
await op('updateProfile', [{ name: '測試司機E2E', phone: '+85298765433', role: 'driver', isActive: true }]);
await op('signOut');
await op('signIn', ['e2e-renter@openvans-test.hk', 'E2ETest123!']);
await op('updateProfile', [{ name: '測試乘客E2E', phone: '+85298765432', role: 'renter', isActive: true }]);
const cb = await op('createBooking', [r.uid]);
console.log('booking:', cb.bookingId);
await op('signOut');
await op('signIn', ['e2e-driver@openvans-test.hk', 'E2ETest123!']);
const ab = await op('acceptBooking', [cb.bookingId, d.uid]);
console.log('accept:', ab);
console.log(`\n✅ Created confirmed booking: ${cb.bookingId}`);
await browser.close();