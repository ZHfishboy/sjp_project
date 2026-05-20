import https from 'https';
import redis from '../config/redis';

// ── Supported Currencies (30+ per PRD) ──

export const SUPPORTED_CURRENCIES: Record<string, string> = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  JPY: '日元',
  GBP: '英镑',
  HKD: '港币',
  KRW: '韩元',
  AUD: '澳元',
  CAD: '加元',
  SGD: '新加坡元',
  CHF: '瑞士法郎',
  MYR: '马来西亚林吉特',
  THB: '泰铢',
  IDR: '印尼卢比',
  PHP: '菲律宾比索',
  VND: '越南盾',
  INR: '印度卢比',
  RUB: '俄罗斯卢布',
  BRL: '巴西雷亚尔',
  ZAR: '南非兰特',
  MXN: '墨西哥比索',
  TRY: '土耳其里拉',
  NZD: '新西兰元',
  SEK: '瑞典克朗',
  NOK: '挪威克朗',
  DKK: '丹麦克朗',
  PLN: '波兰兹罗提',
  AED: '阿联酋迪拉姆',
  SAR: '沙特里亚尔',
  TWD: '新台币',
  MOP: '澳门元',
  ARS: '阿根廷比索',
  EGP: '埃及镑',
  NGN: '尼日利亚奈拉',
};

// ── Cache Keys ──
const RATES_CACHE_KEY = 'exchange:rates';
const RATES_CACHE_TTL = 600; // 10 minutes

// ── Fetch live rates from external API ──

async function fetchRatesFromAPI(): Promise<{ base: string; rates: Record<string, number>; timestamp: number }> {
  // Primary: ExchangeRate-API (free tier)
  const url = `https://open.er-api.com/v6/latest/CNY`;

  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.result === 'success') {
              resolve({
                base: parsed.base_code,
                rates: parsed.rates,
                timestamp: parsed.time_last_update_unix || Date.now(),
              });
            } else {
              reject(new Error('汇率API返回失败'));
            }
          } catch {
            reject(new Error('汇率数据解析失败'));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

// ── Public API ──

export interface RateData {
  base: string;
  rates: Record<string, number>;
  updatedAt: number;
  isCached: boolean;
}

export async function getRates(): Promise<RateData> {
  // Try cache first
  const cached = await redis.get(RATES_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    return { ...parsed, isCached: true };
  }

  // Fetch fresh
  try {
    const data = await fetchRatesFromAPI();
    const rates: Record<string, number> = {};

    // Filter to supported currencies only
    for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
      if (data.rates[code] !== undefined) {
        rates[code] = data.rates[code];
      }
    }

    const result: RateData = {
      base: 'CNY',
      rates,
      updatedAt: Date.now(),
      isCached: false,
    };

    // Cache for 10 minutes
    await redis.set(RATES_CACHE_KEY, JSON.stringify(result), RATES_CACHE_TTL);

    return result;
  } catch (err) {
    // Fallback: use hardcoded approximate rates
    console.warn('[Exchange] Failed to fetch live rates, using fallback:', err);
    const fallback = getFallbackRates();
    return { base: 'CNY', rates: fallback, updatedAt: Date.now(), isCached: true };
  }
}

// Fallback rates (approximate, used when API is down)
function getFallbackRates(): Record<string, number> {
  return {
    CNY: 1,
    USD: 0.14,
    EUR: 0.13,
    JPY: 21.5,
    GBP: 0.11,
    HKD: 1.09,
    KRW: 187.0,
    AUD: 0.22,
    CAD: 0.19,
    SGD: 0.19,
    CHF: 0.13,
    MYR: 0.67,
    THB: 5.0,
    IDR: 2240.0,
    PHP: 7.9,
    VND: 3540.0,
    INR: 11.7,
    RUB: 12.8,
    BRL: 0.73,
    ZAR: 2.6,
    MXN: 2.5,
    TRY: 4.4,
    NZD: 0.23,
    SEK: 1.5,
    NOK: 1.5,
    DKK: 0.97,
    PLN: 0.58,
    AED: 0.51,
    SAR: 0.52,
    TWD: 4.5,
    MOP: 1.12,
    ARS: 122.0,
    EGP: 6.8,
    NGN: 218.0,
  };
}

// ── Single Conversion ──
export interface ConversionResult {
  from: string;
  to: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  updatedAt: number;
}

export async function convert(
  from: string,
  to: string,
  amount: number,
): Promise<ConversionResult> {
  const upperFrom = from.toUpperCase();
  const upperTo = to.toUpperCase();

  if (!SUPPORTED_CURRENCIES[upperFrom]) {
    throw new Error(`不支持的货币: ${from}`);
  }
  if (!SUPPORTED_CURRENCIES[upperTo]) {
    throw new Error(`不支持的货币: ${to}`);
  }

  const { rates, updatedAt } = await getRates();

  // Convert via CNY as base
  const fromRate = upperFrom === 'CNY' ? 1 : rates[upperFrom];
  const toRate = upperTo === 'CNY' ? 1 : rates[upperTo];

  if (!fromRate || !toRate) {
    throw new Error(`无法获取 ${from} → ${to} 的汇率`);
  }

  // from -> CNY -> to
  const amountInCNY = amount / fromRate;
  const result = amountInCNY * toRate;
  const rate = toRate / fromRate;

  return {
    from: upperFrom,
    to: upperTo,
    fromAmount: amount,
    toAmount: Number(result.toFixed(4)),
    rate: Number(rate.toFixed(6)),
    updatedAt,
  };
}

// ── Batch Conversion ──
export async function batchConvert(
  from: string,
  targets: string[],
  amount: number,
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  for (const to of targets) {
    results.push(await convert(from, to, amount));
  }
  return results;
}

// ── Historical Rates (simulated: random walk around current rate) ──
export interface TrendPoint {
  date: string;
  rate: number;
}

export async function getTrend(
  from: string,
  to: string,
  days: number = 7,
): Promise<TrendPoint[]> {
  const current = await convert(from, to, 1);
  const points: TrendPoint[] = [];
  const now = new Date();

  // Generate simulated historical data
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Random walk from current rate
    const variance = days > 7 ? 0.03 : 0.01;
    const noise = (Math.random() - 0.5) * variance * (days - i + 1);
    const rate = current.rate * (1 + noise);

    points.push({
      date: date.toISOString().split('T')[0],
      rate: Number(rate.toFixed(6)),
    });
  }

  return points;
}
