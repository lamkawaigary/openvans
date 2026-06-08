/**
 * OpenVans - 香港隧道及橋樑收費配置
 * 參考 Gogo X / Lalamove 的計費模式
 * 
 * 香港主要隧道及橋樑：
 * - 海底隧道：紅隧(30)、東隧(35)、西隧(40)
 * - 收費道路：青馬(50)、汀九(20)、汲水門(30)
 * - 跨境通道：港珠澳大橋(150)、深圳灣(100)
 */

export type TollType = 'tunnel' | 'bridge' | 'cross_border';

// 隧道/橋樑配置
export interface TollConfig {
  id: string;
  name: string;           // 完整名稱
  shortName: string;      // 簡稱
  type: TollType;         // 類型
  fee: number;            // 標準收費 (HK$)
  peakFee?: number;       // 尖峰時段收費 (HK$)
  nightFee?: number;      // 深夜收費 (HK$)
  description: string;    // 描述
  active: boolean;        // 是否啟用
  // 車型限制 (哪些車型可以使用)
  allowedVehicleTypes?: string[];
}

// ─── 香港隧道及橋樑完整配置 ────────────────────────────────────────────────

export const HK_TOLL_CONFIGS: Record<string, TollConfig> = {
  // ── 海底隧道 ──
  cross_harbour_tunnel: {
    id: 'cross_harbour_tunnel',
    name: '紅磡海底隧道',
    shortName: '紅隧',
    type: 'tunnel',
    fee: 30,
    description: '來往九龍與香港島的主要隧道，1972年通車',
    active: true,
  },
  eastern_harbour_tunnel: {
    id: 'eastern_harbour_tunnel',
    name: '東區海底隧道',
    shortName: '東隧',
    type: 'tunnel',
    fee: 35,
    description: '來往九龍與香港島（東區），1989年通車',
    active: true,
  },
  western_harbour_tunnel: {
    id: 'western_harbour_tunnel',
    name: '西區海底隧道',
    shortName: '西隧',
    type: 'tunnel',
    fee: 40,
    description: '來往九龍與香港島（西區），1997年通車',
    active: true,
  },

  // ── 收費橋樑 ──
  shatin_crossover: {
    id: 'shatin_crossover',
    name: '大埔公路（沙田段）',
    shortName: '沙田道',
    type: 'bridge',
    fee: 25,
    description: '大埔公路沙田段收費',
    active: true,
  },
  tsing_ma_bridge: {
    id: 'tsing_ma_bridge',
    name: '青馬大橋',
    shortName: '青馬',
    type: 'bridge',
    fee: 50,
    description: '來往大嶼山與市區的主要通道（機場/迪士尼路線）',
    active: true,
  },
  kap_shui_mun_bridge: {
    id: 'kap_shui_mun_bridge',
    name: '汲水門大橋',
    shortName: '汲水門',
    type: 'bridge',
    fee: 30,
    description: '來往馬灣與青衣',
    active: true,
  },
  ting_kau_bridge: {
    id: 'ting_kau_bridge',
    name: '汀九橋',
    shortName: '汀九',
    type: 'bridge',
    fee: 20,
    description: '來往青衣與汀九',
    active: true,
  },
  lantau_link: {
    id: 'lantau_link',
    name: '北大嶼山公路',
    shortName: '大嶼山',
    type: 'bridge',
    fee: 40,
    description: '來往機場與東涌',
    active: true,
  },

  // ── 跨境通道 ──
  hong_kong_zhuhai_macao_bridge: {
    id: 'hong_kong_zhuhai_macao_bridge',
    name: '港珠澳大橋',
    shortName: '港珠澳',
    type: 'cross_border',
    fee: 150,
    description: '跨境大橋 - 香港至珠海/澳門（需要許可證）',
    active: true,
    allowedVehicleTypes: ['truck_5_5t', 'truck_9_5t'], // 跨境需要5.5噸或以上
  },
  shenzhen_bay_bridge: {
    id: 'shenzhen_bay_bridge',
    name: '深圳灣大橋',
    shortName: '深圳灣',
    type: 'cross_border',
    fee: 100,
    description: '跨境通道 - 香港至深圳（需要許可證）',
    active: true,
    allowedVehicleTypes: ['light', 'truck_5_5t', 'truck_9_5t'],
  },
};

// ─── 時段收費配置 ──────────────────────────────────────────────────────────

export interface TimePricingConfig {
  name: string;
  hours: [number, number][];  // [[start, end], ...]
  multiplier: number;
  description?: string;
}

export const TIME_PRICING: Record<string, TimePricingConfig> = {
  peakMorning: {
    name: '早上高峰',
    hours: [[7, 9]],
    multiplier: 1.2,
    description: '7:00-9:00 繁忙時段',
  },
  peakEvening: {
    name: '傍晚高峰',
    hours: [[17, 20]],
    multiplier: 1.2,
    description: '17:00-20:00 繁忙時段',
  },
  offPeak: {
    name: '標準時段',
    hours: [[9, 17], [20, 23]],
    multiplier: 1.0,
    description: '9:00-17:00, 20:00-23:00 標準收費',
  },
  lateNight: {
    name: '深夜時段',
    hours: [[23, 24], [0, 6]],
    multiplier: 1.3,
    description: '23:00-06:00 深夜加收30%',
  },
};

// ─── 週末/假日附加費 ───────────────────────────────────────────────────────

export const WEEKEND_MULTIPLIER = 1.1;    // 週末 +10%
export const HOLIDAY_MULTIPLIER = 1.25;  // 公眾假期 +25%

// 香港公眾假期列表（2024-2026）
export const HK_HOLIDAYS = [
  // 2024
  '2024-01-01', // 元旦
  '2024-02-10', // 農曆新年
  '2024-02-12', // 農曆新年
  '2024-02-13', // 農曆新年
  '2024-04-04', // 清明節
  '2024-04-05', // 耶穌受難日
  '2024-04-01', // 復活節
  '2024-05-01', // 勞動節
  '2024-05-15', // 佛誕
  '2024-07-01', // 回歸紀念日
  '2024-09-18', // 中秋節
  '2024-10-01', // 國慶日
  '2024-10-11', // 重陽節
  '2024-12-25', // 聖誕節
  '2024-12-26', // 聖誕節翌日
  // 2025
  '2025-01-01', // 元旦
  '2025-01-29', // 農曆新年
  '2025-01-30', // 農曆新年
  '2025-01-31', // 農曆新年
  '2025-04-04', // 清明節
  '2025-04-18', // 耶穌受難日
  '2025-04-21', // 復活節
  '2025-05-01', // 勞動節
  '2025-05-31', // 佛誕
  '2025-07-01', // 回歸紀念日
  '2025-10-07', // 重陽節
  '2025-10-01', // 國慶日
  '2025-12-25', // 聖誕節
  '2025-12-26', // 聖誕節翌日
  // 2026
  '2026-01-01', // 元旦
  '2026-02-17', // 農曆新年
  '2026-02-18', // 農曆新年
  '2026-02-19', // 農曆新年
  '2026-04-03', // 清明節
  '2026-04-06', // 耶穌受難日
  '2026-04-10', // 復活節
  '2026-05-01', // 勞動節
  '2026-05-21', // 佛誕
  '2026-07-01', // 回歸紀念日
  '2026-10-01', // 國慶日
  '2026-10-26', // 重陽節
  '2026-12-25', // 聖誕節
  '2026-12-26', // 聖誕節翌日
];

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * 檢查是否為香港公眾假期
 */
export function isHongKongHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return HK_HOLIDAYS.includes(dateStr);
}

/**
 * 檢查是否為週末
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 獲取時段乘數
 */
export function getTimeMultiplier(date: Date): number {
  const hour = date.getHours();
  
  // 深夜時段 (最高優先級)
  if (TIME_PRICING.lateNight.hours.some(([start, end]) => 
    (end === 24 && hour >= start) || (end !== 24 && hour >= start && hour < end)
  )) {
    return TIME_PRICING.lateNight.multiplier;
  }
  
  // 早上高峰
  if (TIME_PRICING.peakMorning.hours.some(([start, end]) => 
    hour >= start && hour < end
  )) {
    return TIME_PRICING.peakMorning.multiplier;
  }
  
  // 傍晚高峰
  if (TIME_PRICING.peakEvening.hours.some(([start, end]) => 
    hour >= start && hour < end
  )) {
    return TIME_PRICING.peakEvening.multiplier;
  }
  
  return 1.0; // 標準時段
}

/**
 * 獲取時段名稱
 */
export function getTimeSlotName(date: Date): string {
  const hour = date.getHours();
  
  if (TIME_PRICING.lateNight.hours.some(([start, end]) => 
    (end === 24 && hour >= start) || (end !== 24 && hour >= start && hour < end)
  )) {
    return TIME_PRICING.lateNight.name;
  }
  
  if (TIME_PRICING.peakMorning.hours.some(([start, end]) => 
    hour >= start && hour < end
  )) {
    return TIME_PRICING.peakMorning.name;
  }
  
  if (TIME_PRICING.peakEvening.hours.some(([start, end]) => 
    hour >= start && hour < end
  )) {
    return TIME_PRICING.peakEvening.name;
  }
  
  return TIME_PRICING.offPeak.name;
}

/**
 * 計算時段附加費
 */
export function calculateTimeSurcharge(baseAmount: number, date: Date): number {
  const multiplier = getTimeMultiplier(date);
  const surcharge = Math.round(baseAmount * (multiplier - 1));
  return surcharge;
}

/**
 * 獲取週末/假日附加費
 */
export function calculateWeekendHolidaySurcharge(baseAmount: number, date: Date): number {
  if (isHongKongHoliday(date)) {
    return Math.round(baseAmount * (HOLIDAY_MULTIPLIER - 1));
  }
  if (isWeekend(date)) {
    return Math.round(baseAmount * (WEEKEND_MULTIPLIER - 1));
  }
  return 0;
}

/**
 * 獲取隧道/橋樑的實際收費（考慮車型和時段）
 */
export function getTollFee(tollId: string, vehicleType: string, date?: Date): number {
  const toll = HK_TOLL_CONFIGS[tollId];
  if (!toll || !toll.active) return 0;
  
  // 檢查車型限制
  if (toll.allowedVehicleTypes && !toll.allowedVehicleTypes.includes(vehicleType)) {
    return 0;
  }
  
  const baseFee = toll.fee;
  
  // 如果沒有指定日期，返回標準收費
  if (!date) return baseFee;
  
  // 考慮時段
  const multiplier = getTimeMultiplier(date);
  return Math.round(baseFee * multiplier);
}

/**
 * 獲取所有適用的隧道/橋樑（根據車型）
 */
export function getAvailableTolls(vehicleType: string): TollConfig[] {
  return Object.values(HK_TOLL_CONFIGS).filter(toll => {
    if (!toll.active) return false;
    if (toll.allowedVehicleTypes && !toll.allowedVehicleTypes.includes(vehicleType)) {
      return false;
    }
    return true;
  });
}

/**
 * 格式化收費描述
 */
export function formatTollDescription(toll: TollConfig): string {
  let desc = `${toll.name} (${toll.shortName}): HK$${toll.fee}`;
  if (toll.peakFee) {
    desc += ` | 尖峰: HK$${toll.peakFee}`;
  }
  if (toll.nightFee) {
    desc += ` | 深夜: HK$${toll.nightFee}`;
  }
  return desc;
}

// ─── 預設隧道列表（用於 RouteSelection 組件）────────────────────────────────

export const DEFAULT_TUNNEL_ROUTES = [
  {
    id: 'cross_harbour',
    name: '過海路線（紅隧）',
    tolls: ['cross_harbour_tunnel'],
    estimatedCost: 30,
    description: '經紅磡海底隧道過海',
  },
  {
    id: 'cross_harbour_eastern',
    name: '過海路線（東隧）',
    tolls: ['eastern_harbour_tunnel'],
    estimatedCost: 35,
    description: '經東區海底隧道過海',
  },
  {
    id: 'cross_harbour_western',
    name: '過海路線（西隧）',
    tolls: ['western_harbour_tunnel'],
    estimatedCost: 40,
    description: '經西區海底隧道過海',
  },
  {
    id: 'airport_route',
    name: '機場路線',
    tolls: ['tsing_ma_bridge', 'kap_shui_mun_bridge', 'lantau_link'],
    estimatedCost: 120,
    description: '經青馬大橋來往機場/迪士尼',
  },
  {
    id: 'cross_border_zh',
    name: '跨境至珠海/澳門',
    tolls: ['hong_kong_zhuhai_macao_bridge'],
    estimatedCost: 150,
    description: '經港珠澳大橋跨境（需許可證）',
  },
  {
    id: 'cross_border_sz',
    name: '跨境至深圳',
    tolls: ['shenzhen_bay_bridge'],
    estimatedCost: 100,
    description: '經深圳灣大橋跨境（需許可證）',
  },
];

/**
 * 計算路線的總隧道/橋樑費用
 */
export function calculateRouteTollCost(
  routeTollIds: string[], 
  vehicleType: string, 
  date?: Date
): number {
  return routeTollIds.reduce((total, tollId) => {
    return total + getTollFee(tollId, vehicleType, date);
  }, 0);
}