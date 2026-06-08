/**
 * OpenVans - 測試數據生成腳本
 * 新增不同類別的測試帳戶和司機車輛
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg",
  authDomain: "openvans.firebaseapp.com",
  projectId: "openvans",
  storageBucket: "openvans.firebasestorage.app",
  messagingSenderId: "547677087724",
  appId: "1:547677087724:web:e8b8f201b0c7eb412582c9",
  measurementId: "G-WNHJ65RKN9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seedTestData() {
  console.log('🚀 開始新增測試數據...\n');

  // 登入測試管理員帳戶
  console.log('🔐 登入管理員帳戶...');
  try {
    await signInWithEmailAndPassword(auth, 'admin@openvans.hk', 'test123456');
    console.log('  ✅ 登入成功');
  } catch (e) {
    console.log('  ⚠️ 無法登入，將以匿名方式寫入');
  }

  // ─── 1. 測試用戶 (不同角色) ────────────────────────────────────────
  
  const testUsers = [
    {
      uid: 'test_admin_001',
      name: '系統管理員',
      phone: '+852 9999 0001',
      email: 'admin@openvans.hk',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'test_driver_001',
      name: '陳偉明',
      phone: '+852 6123 4567',
      email: 'driver1@openvans.hk',
      role: 'owner',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'test_driver_002',
      name: '李志強',
      phone: '+852 6234 5678',
      email: 'driver2@openvans.hk',
      role: 'owner',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'test_driver_003',
      name: '張家成',
      phone: '+852 6345 6789',
      email: 'driver3@openvans.hk',
      role: 'owner',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'test_renter_001',
      name: '王小明',
      phone: '+852 6456 7890',
      email: 'renter1@openvans.hk',
      role: 'renter',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'test_renter_002',
      name: '劉美美',
      phone: '+852 6567 8901',
      email: 'renter2@openvans.hk',
      role: 'renter',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'test_renter_003',
      name: '黃大文',
      phone: '+852 6678 9012',
      email: 'renter3@openvans.hk',
      role: 'renter',
      isActive: false, // 停用帳戶
      createdAt: new Date().toISOString(),
    },
  ];

  console.log('📝 新增用戶帳戶...');
  for (const user of testUsers) {
    await setDoc(doc(db, 'users', user.uid), user);
    console.log(`  ✅ ${user.name} (${user.role})`);
  }

  // ─── 2. 測試車輛 (不同類型) ─────────────────────────────────────────
  
  const testVans = [
    {
      id: 'van_001',
      ownerId: 'test_driver_001',
      plateNumber: 'TV 1234',
      vehicleType: 'light',
      make: 'Toyota',
      model: 'HiAce',
      capacityKg: 1000,
      capacityM3: 8,
      isAvailable: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'van_002',
      ownerId: 'test_driver_001',
      plateNumber: 'TV 5678',
      vehicleType: 'truck_5_5t',
      make: 'Isuzu',
      model: 'NLR',
      capacityKg: 2000,
      capacityM3: 12,
      isAvailable: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'van_003',
      ownerId: 'test_driver_002',
      plateNumber: 'TV 9012',
      vehicleType: 'truck_9_5t',
      make: 'Hino',
      model: 'Forward',
      capacityKg: 4000,
      capacityM3: 20,
      isAvailable: false, // 不可用
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'van_004',
      ownerId: 'test_driver_002',
      plateNumber: 'TV 3456',
      vehicleType: 'light',
      make: 'Ford',
      model: 'Transit',
      capacityKg: 1200,
      capacityM3: 10,
      isAvailable: true,
      isVerified: false, // 待認證
      createdAt: new Date().toISOString(),
    },
    {
      id: 'van_005',
      ownerId: 'test_driver_003',
      plateNumber: 'TM 7890',
      vehicleType: 'motorcycle',
      make: 'Honda',
      model: 'ADV150',
      capacityKg: 50,
      capacityM3: 0.5,
      isAvailable: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
  ];

  console.log('\n🚐 新增車輛...');
  for (const van of testVans) {
    await setDoc(doc(db, 'vans', van.id), van);
    console.log(`  ✅ ${van.make} ${van.model} (${van.plateNumber}) - ${van.vehicleType}`);
  }

  // ─── 3. 測試訂單 (不同狀態) ─────────────────────────────────────────
  
  const now = new Date();
  const testBookings = [
    {
      id: 'booking_001',
      renterId: 'test_renter_001',
      vanId: 'van_001',
      ownerId: 'test_driver_001',
      pickupAddress: '九龍旺角彌敦道 610 號',
      pickupLat: 22.3176,
      pickupLng: 114.1716,
      dropoffAddress: '香港島中環荷李活道 1 號',
      dropoffLat: 22.2810,
      dropoffLng: 114.1580,
      loads: [{ type: 'medium', count: 3 }],
      totalLoadCount: 3,
      vehicleTypeRequired: 'light',
      estimatedPrice: 285,
      finalPrice: 285,
      status: 'completed',
      pickupTime: new Date(now.getTime() - 86400000).toISOString(), // 昨天
      createdAt: new Date(now.getTime() - 90000000).toISOString(),
      completedAt: new Date(now.getTime() - 82800000).toISOString(),
      fareBreakdown: {
        baseFare: 60,
        distanceFare: 120,
        speedSurcharge: 0,
        peakSurge: 27,
        lateNightSurge: 0,
        weekendSurge: 0,
        extraStopFare: 0,
        loadSurcharge: 15,
        insuranceFare: 0,
        assistantFare: 0,
        tunnelFare: 30,
        parkingFare: 0,
        stairFare: 0,
        total: 285,
        currency: 'HK$',
        distanceKm: 8.5,
        minimumFare: 50,
        tollsReserved: 0,
      },
      routeInfo: {
        distanceKm: 8.5,
        distanceMeters: 8500,
        durationMinutes: 35,
      },
    },
    {
      id: 'booking_002',
      renterId: 'test_renter_002',
      vanId: 'van_002',
      ownerId: 'test_driver_001',
      pickupAddress: '新界沙田石門安明街 3 號',
      pickupLat: 22.3885,
      pickupLng: 114.2350,
      dropoffAddress: '九龍觀塘觀塘道 388 號',
      dropoffLat: 22.3128,
      dropoffLng: 114.2246,
      loads: [{ type: 'large', count: 5 }],
      totalLoadCount: 5,
      vehicleTypeRequired: 'truck_5_5t',
      estimatedPrice: 450,
      status: 'in_progress',
      pickupTime: new Date(now.getTime() + 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 1800000).toISOString(),
      fareBreakdown: {
        baseFare: 100,
        distanceFare: 180,
        speedSurcharge: 0,
        peakSurge: 0,
        lateNightSurge: 0,
        weekendSurge: 0,
        extraStopFare: 0,
        loadSurcharge: 50,
        insuranceFare: 20,
        assistantFare: 0,
        tunnelFare: 60,
        parkingFare: 40,
        stairFare: 0,
        total: 450,
        currency: 'HK$',
        distanceKm: 15,
        minimumFare: 90,
        tollsReserved: 0,
      },
      routeInfo: {
        distanceKm: 15,
        distanceMeters: 15000,
        durationMinutes: 45,
      },
    },
    {
      id: 'booking_003',
      renterId: 'test_renter_001',
      pickupAddress: '香港島北角英皇道 888 號',
      pickupLat: 22.2923,
      pickupLng: 114.1921,
      dropoffAddress: '九龍黃大仙龍翔道 136 號',
      dropoffLat: 22.3376,
      dropoffLng: 114.1955,
      loads: [{ type: 'small', count: 2 }],
      totalLoadCount: 2,
      vehicleTypeRequired: 'motorcycle',
      estimatedPrice: 85,
      status: 'pending',
      pickupTime: new Date(now.getTime() + 7200000).toISOString(),
      createdAt: new Date(now.getTime() - 600000).toISOString(),
    },
    {
      id: 'booking_004',
      renterId: 'test_renter_003',
      vanId: 'van_004',
      ownerId: 'test_driver_002',
      pickupAddress: '新界元朗教育路 9 號',
      pickupLat: 22.4452,
      pickupLng: 114.0234,
      dropoffAddress: '九龍荔枝角長義街 2 號',
      dropoffLat: 22.3365,
      dropoffLng: 114.1456,
      loads: [{ type: 'medium', count: 8 }],
      totalLoadCount: 8,
      vehicleTypeRequired: 'light',
      estimatedPrice: 380,
      status: 'confirmed',
      pickupTime: new Date(now.getTime() + 14400000).toISOString(),
      createdAt: new Date(now.getTime() - 300000).toISOString(),
    },
    {
      id: 'booking_005',
      renterId: 'test_renter_002',
      pickupAddress: '香港島薄扶林薄扶林道 162 號',
      pickupLat: 22.2645,
      pickupLng: 114.1323,
      dropoffAddress: '九龍藍田啟田道 48 號',
      dropoffLat: 22.2923,
      dropoffLng: 114.2312,
      loads: [{ type: 'large', count: 10 }],
      totalLoadCount: 10,
      vehicleTypeRequired: 'truck_9_5t',
      estimatedPrice: 680,
      status: 'cancelled',
      pickupTime: new Date(now.getTime() - 43200000).toISOString(),
      createdAt: new Date(now.getTime() - 45000000).toISOString(),
      notes: '客戶取消 - 行程變更',
    },
  ];

  console.log('\n📋 新增測試訂單...');
  for (const booking of testBookings) {
    await setDoc(doc(db, 'bookings', booking.id), booking);
    console.log(`  ✅ ${booking.id} - ${booking.status} (HK$${booking.estimatedPrice || 'N/A'})`);
  }

  // ─── 4. 隧道和橋樑收費配置 ───────────────────────────────────────────
  
  const tunnelConfig = {
    id: 'toll_config_hk',
    updatedAt: new Date().toISOString(),
    tolls: [
      {
        id: 'cross_harbour_tunnel',
        name: '紅磡海底隧道',
        shortName: '紅隧',
        type: 'tunnel',
        fee: 30,
        description: '來往九龍與香港島的主要隧道',
        active: true,
      },
      {
        id: 'eastern_harbour_tunnel',
        name: '東區海底隧道',
        shortName: '東隧',
        type: 'tunnel',
        fee: 35,
        description: '來往九龍與香港島（東區）',
        active: true,
      },
      {
        id: 'western_harbour_tunnel',
        name: '西區海底隧道',
        shortName: '西隧',
        type: 'tunnel',
        fee: 40,
        description: '來往九龍與香港島（西區）',
        active: true,
      },
      {
        id: 'shatin_crossover',
        name: '沙田馬場道',
        shortName: '沙田',
        type: 'bridge',
        fee: 25,
        description: '大埔公路沙田段',
        active: true,
      },
      {
        id: 'tsing_ma_bridge',
        name: '青馬大橋',
        shortName: '青馬',
        type: 'bridge',
        fee: 50,
        description: '來往大嶼山與市區（跨境/機場路線）',
        active: true,
      },
      {
        id: 'kap_shui_mun_bridge',
        name: '汲水門大橋',
        shortName: '汲水門',
        type: 'bridge',
        fee: 30,
        description: '來往馬灣與青衣',
        active: true,
      },
      {
        id: 'ting_kaus_bridge',
        name: '汀九橋',
        shortName: '汀九',
        type: 'bridge',
        fee: 20,
        description: '來往青衣與汀九',
        active: true,
      },
      {
        id: 'lantau_link',
        name: '北大嶼山公路',
        shortName: '大嶼山',
        type: 'bridge',
        fee: 40,
        description: '來往機場與東涌',
        active: true,
      },
      // 跨境隧道
      {
        id: 'hong_kong_zhuhai_macao_bridge',
        name: '港珠澳大橋',
        shortName: '港珠澳',
        type: 'cross_border',
        fee: 150,
        description: '跨境大橋 - 香港至珠海/澳門',
        active: true,
      },
      {
        id: 'shenzhen_bay_bridge',
        name: '深圳灣大橋',
        shortName: '深圳灣',
        type: 'cross_border',
        fee: 100,
        description: '跨境通道 - 香港至深圳',
        active: true,
      },
    ],
    // 不同時段收費配置
    timeBasedPricing: {
      peak: {
        hours: [[7, 9], [17, 20]],
        multiplier: 1.2,
        name: '高峰時段',
      },
      offPeak: {
        hours: [[10, 16], [21, 23]],
        multiplier: 1.0,
        name: '標準時段',
      },
      lateNight: {
        hours: [[23, 24], [0, 6]],
        multiplier: 1.3,
        name: '深夜時段',
      },
    },
    // 週末/假日附加費
    weekendMultiplier: 1.1,
    holidayMultiplier: 1.25,
  };

  console.log('\n🚇 新增隧道/橋樑收費配置...');
  await setDoc(doc(db, 'config', 'toll_config'), tunnelConfig);
  console.log(`  ✅ 已儲存 ${tunnelConfig.tolls.length} 個收費項目`);

  // ─── 5. 計費配置 ────────────────────────────────────────────────────
  
  const billingConfig = {
    id: 'billing_config',
    updatedAt: new Date().toISOString(),
    // 平台服務費率
    platformFeePercent: 15, // 15% 平台服務費
    paymentProcessingFeePercent: 2.5, // 支付處理費
    // 最低收費
    minimumFareByVehicleType: {
      motorcycle: 25,
      light: 50,
      truck_5_5t: 90,
      truck_9_5t: 130,
      sedan: 45,
      van_7: 65,
    },
    // 里程收費
    perKmRateByVehicleType: {
      motorcycle: 2.5,
      light: 4.0,
      truck_5_5t: 6.0,
      truck_9_5t: 8.5,
      sedan: 3.5,
      van_7: 4.5,
    },
    // 附加服務收費
    surcharges: {
      immediate: 1.3,      // 即時：+30%
      '4hour': 1.0,        // 4小時：標準
      sameday: 0.9,        // 即日：-10%
      scheduled: 0.85,      // 預約：-15%
    },
    // 隧道/橋樑預設收費
    defaultTunnelFee: 30,
    defaultBridgeFee: 25,
    // 樓梯費
    stairFeePerFloor: 20,
    // 停車費默認
    defaultParkingFee: 0,
    // 保險費
    insuranceFee: 20,
    // 助手費
    assistantFee: 30,
    // 額外停靠站費用
    extraStopFee: 20,
  };

  console.log('\n💰 新增計費配置...');
  await setDoc(doc(db, 'config', 'billing_config'), billingConfig);
  console.log('  ✅ 計費配置已儲存');

  console.log('\n✅ 所有測試數據新增完成！');
  console.log('\n📊 數據摘要:');
  console.log(`  - 用戶帳戶: ${testUsers.length} 個`);
  console.log(`  - 車輛: ${testVans.length} 部`);
  console.log(`  - 測試訂單: ${testBookings.length} 張`);
  console.log(`  - 隧道/橋樑收費: ${tunnelConfig.tolls.length} 項`);
}

seedTestData().catch(console.error);