import { db } from '../config/database';
import redis from '../config/redis';
import { config } from '../config';

// ====================================================================
// Plan Definitions (per PRD 3.7)
// ====================================================================

export interface TimePlan {
  id: string;
  name: string;
  level: number;   // 0=体验 1=月度 2=季度 3=年度 4=永久
  days: number;     // 0 for perpetual
  price: number;    // in CNY yuan
  originalPrice: number;
  features: string[];
  badge: string;
}

export interface TokenPlan {
  id: string;
  name: string;
  tokens: number;
  bonus: number;
  price: number;
  unitPrice: string;
}

export interface GiftPack {
  id: string;
  name: string;
  tokens: number;
  vipDays: number;
  price: number;
  originalPrice: number;
  discount: string;
}

export const TIME_PLANS: TimePlan[] = [
  {
    id: 'trial',
    name: '体验 VIP',
    level: 0,
    days: 3,
    price: 0,
    originalPrice: 0,
    features: ['全部 VIP 功能体验', '3天有效'],
    badge: '免费',
  },
  {
    id: 'monthly',
    name: '月度 VIP',
    level: 1,
    days: 30,
    price: 12,
    originalPrice: 12,
    features: ['全部 VIP 功能', '速率升至二等', '无广告'],
    badge: '',
  },
  {
    id: 'quarterly',
    name: '季度 VIP',
    level: 2,
    days: 90,
    price: 29,
    originalPrice: 36,
    features: ['月度全部权益', '专属皮肤 2 套', '速率二等'],
    badge: '热卖',
  },
  {
    id: 'annual',
    name: '年度 VIP',
    level: 3,
    days: 365,
    price: 88,
    originalPrice: 144,
    features: ['季度全部权益', '优先客服', '数据导出', '速率一等 ⚡'],
    badge: '推荐',
  },
  {
    id: 'perpetual',
    name: '永久 VIP',
    level: 4,
    days: 0,
    price: 198,
    originalPrice: 0,
    features: ['终身免续费', '专属金色徽章', '速率一等 ⚡', '全部功能永久解锁'],
    badge: '至尊',
  },
];

export const TOKEN_PLANS: TokenPlan[] = [
  { id: 'tokens_100', name: '小试牛刀', tokens: 100, bonus: 0, price: 6, unitPrice: '¥0.06/币' },
  { id: 'tokens_500', name: '精打细算', tokens: 500, bonus: 10, price: 25, unitPrice: '¥0.05/币' },
  { id: 'tokens_1200', name: '算无遗策', tokens: 1200, bonus: 50, price: 50, unitPrice: '¥0.042/币' },
  { id: 'tokens_3000', name: '计算大师', tokens: 3000, bonus: 200, price: 98, unitPrice: '¥0.033/币' },
  { id: 'tokens_10000', name: '无限算力', tokens: 10000, bonus: 1200, price: 198, unitPrice: '¥0.02/币' },
];

export const GIFT_PACKS: GiftPack[] = [
  { id: 'starter', name: '入门礼包', tokens: 50, vipDays: 3, price: 1, originalPrice: 9, discount: '1.1折' },
  { id: 'value', name: '超值礼包', tokens: 300, vipDays: 30, price: 12, originalPrice: 30, discount: '4折' },
  { id: 'premium', name: '至尊礼包', tokens: 1200, vipDays: 90, price: 48, originalPrice: 79, discount: '6折' },
];

// ====================================================================
// Speed Tier (per PRD 3.11)
// ====================================================================

export interface SpeedTierInfo {
  tier: number;       // 1=⚡ 2=🚗 3=🐢
  name: string;
  emoji: string;
  delayMs: number;
  maxConcurrency: number;
  requiredRecharge: number;
  features: string[];
}

export function getSpeedTier(totalRecharge: number): SpeedTierInfo {
  if (totalRecharge >= 200) {
    return {
      tier: 1,
      name: '闪电模式',
      emoji: '⚡',
      delayMs: config.speedTier.tier1DelayMs,
      maxConcurrency: Infinity,
      requiredRecharge: 200,
      features: ['0ms 延迟', 'GPU 加速', '结果预缓存', '无限并发'],
    };
  }
  if (totalRecharge >= 50) {
    return {
      tier: 2,
      name: '正常模式',
      emoji: '🚗',
      delayMs: config.speedTier.tier2DelayMs,
      maxConcurrency: 3,
      requiredRecharge: 50,
      features: ['200ms 延迟', '3 并发请求'],
    };
  }
  return {
    tier: 3,
    name: '乌龟模式',
    emoji: '🐢',
    delayMs: config.speedTier.tier3DelayMs,
    maxConcurrency: 1,
    requiredRecharge: 0,
    features: ['3000ms 延迟', '1 并发请求'],
  };
}

export function getUpgradeProgress(totalRecharge: number): {
  currentTier: SpeedTierInfo;
  nextTier: SpeedTierInfo | null;
  needRecharge: number;
  progressPercent: number;
} {
  const currentTier = getSpeedTier(totalRecharge);

  let nextTier: SpeedTierInfo | null = null;
  let needRecharge = 0;
  let progressPercent = 100;

  if (currentTier.tier === 3) {
    nextTier = getSpeedTier(50);
    needRecharge = 50 - totalRecharge;
    progressPercent = Math.min(100, (totalRecharge / 50) * 100);
  } else if (currentTier.tier === 2) {
    nextTier = getSpeedTier(200);
    needRecharge = 200 - totalRecharge;
    progressPercent = Math.min(100, ((totalRecharge - 50) / 150) * 100);
  }

  return { currentTier, nextTier, needRecharge, progressPercent };
}

// ====================================================================
// Cumulative Recharge Achievements (per PRD 3.7.3)
// ====================================================================

export interface Achievement {
  name: string;
  badge: string;
  requiredRecharge: number;
  permanentBenefit: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { name: '青铜算士', badge: '🥉', requiredRecharge: 50, permanentBenefit: '' },
  { name: '白银算师', badge: '🥈', requiredRecharge: 150, permanentBenefit: '' },
  { name: '黄金算宗', badge: '🥇', requiredRecharge: 500, permanentBenefit: '永久解锁全部高级科学计算' },
  { name: '钻石算神', badge: '💎', requiredRecharge: 1500, permanentBenefit: '永久解锁全部 VIP 功能' },
];

export function getAchievements(totalRecharge: number): {
  earned: Achievement[];
  next: Achievement | null;
} {
  const earned = ACHIEVEMENTS.filter((a) => totalRecharge >= a.requiredRecharge);
  const next = ACHIEVEMENTS.find((a) => totalRecharge < a.requiredRecharge) || null;
  return { earned, next };
}

// ====================================================================
// Wallet Helpers
// ====================================================================

export async function getOrCreateWallet(userId: number) {
  let wallet = await db('user_wallet').where({ user_id: userId }).first();
  if (!wallet) {
    await db('user_wallet').insert({ user_id: userId });
    wallet = await db('user_wallet').where({ user_id: userId }).first();
  }
  return wallet;
}

export async function addTokens(
  userId: number,
  amount: number,
  source: 'purchase' | 'gift' | 'invite' = 'purchase',
) {
  const wallet = await getOrCreateWallet(userId);
  const updates: any = {
    token_balance: wallet.token_balance + amount,
    ...(source === 'purchase'
      ? { total_tokens_purchased: wallet.total_tokens_purchased + amount }
      : { total_tokens_earned: wallet.total_tokens_earned + amount }),
  };
  await db('user_wallet').where({ user_id: userId }).update(updates);
  return { ...wallet, ...updates };
}

export async function activateVip(userId: number, level: number, days: number) {
  // Check existing active VIP
  const existing = await db('user_vip')
    .where({ user_id: userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  const now = new Date();
  let startDate = now;
  let endDate: Date | null = null;

  if (days > 0) {
    if (existing && existing.level !== 4) {
      // Extend from current expiration
      startDate = existing.end_date || now;
      if (startDate < now) startDate = now;
      endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
      // Deactivate old record
      await db('user_vip').where({ id: existing.id }).update({ status: 0 });
    } else {
      endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
  } else {
    // Perpetual
    endDate = null;
    if (existing) {
      await db('user_vip').where({ id: existing.id }).update({ status: 0 });
    }
  }

  await db('user_vip').insert({
    user_id: userId,
    level,
    start_date: startDate,
    end_date: endDate,
    status: 1,
  });
}

export async function updateSpeedTier(userId: number, totalRecharge: number) {
  const tierInfo = getSpeedTier(totalRecharge);

  const existing = await db('user_rate_tier').where({ user_id: userId }).first();
  if (existing) {
    if (existing.tier !== tierInfo.tier) {
      await db('user_rate_tier').where({ user_id: userId }).update({
        tier: tierInfo.tier,
        delay_ms: tierInfo.delayMs,
        max_concurrency: tierInfo.maxConcurrency === Infinity ? 999 : tierInfo.maxConcurrency,
        upgraded_at: new Date(),
      });
    }
  } else {
    await db('user_rate_tier').insert({
      user_id: userId,
      tier: tierInfo.tier,
      delay_ms: tierInfo.delayMs,
      max_concurrency: tierInfo.maxConcurrency === Infinity ? 999 : tierInfo.maxConcurrency,
    });
  }
}

// ====================================================================
// VIP Feature List
// ====================================================================
export const VIP_FEATURES = [
  { key: 'scientific', name: '科学计算', desc: '三角函数、对数、指数、阶乘', icon: '📐' },
  { key: 'equation', name: '方程求解', desc: '一元二次、线性方程组', icon: '📊' },
  { key: 'matrix', name: '矩阵运算', desc: '加减乘除、转置、行列式、求逆', icon: '🔢' },
  { key: 'base', name: '进制转换', desc: '2/8/10/16 进制互转', icon: '🔣' },
  { key: 'statistics', name: '统计分析', desc: '均值、中位数、方差、回归', icon: '📈' },
  { key: 'advancedCalc', name: '高级运算', desc: '超越函数、多项式求解', icon: '⚡' },
  { key: 'premiumUnit', name: '高级单位换算', desc: '压强、功率、油耗等', icon: '📏' },
  { key: 'rateAlert', name: '汇率到价提醒', desc: '设置目标汇率自动通知', icon: '💱' },
  { key: 'speedTier', name: '速度加速', desc: '摆脱龟速，秒出结果', icon: '🚀' },
  { key: 'unlimitedFavorites', name: '无限收藏', desc: '收藏夹容量无限', icon: '⭐' },
  { key: 'noAds', name: '无广告', desc: '免开屏弹窗广告', icon: '🚫' },
  { key: 'export', name: '数据导出', desc: '导出计算历史数据', icon: '📥' },
];

// ====================================================================
// VIP Status
// ====================================================================

export async function getVipStatus(userId: number) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new Error('用户不存在');

  const wallet = await getOrCreateWallet(userId);

  const vip = await db('user_vip')
    .where({ user_id: userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  const tierInfo = getSpeedTier(user.total_recharge);
  const achievements = getAchievements(user.total_recharge);
  const upgradeProgress = getUpgradeProgress(user.total_recharge);

  return {
    userId,
    totalRecharge: user.total_recharge,
    wallet: {
      balance: wallet.token_balance,
      totalPurchased: wallet.total_tokens_purchased,
      totalConsumed: wallet.total_tokens_consumed,
      totalEarned: wallet.total_tokens_earned,
    },
    vip: vip
      ? {
          level: vip.level,
          levelName: ['', '月度 VIP', '季度 VIP', '年度 VIP', '永久 VIP'][vip.level],
          startDate: vip.start_date,
          endDate: vip.end_date,
          isPerpetual: vip.level === 4,
          autoRenew: !!vip.auto_renew,
          daysLeft: vip.end_date
            ? Math.max(0, Math.ceil((new Date(vip.end_date).getTime() - Date.now()) / 86400000))
            : Infinity,
        }
      : null,
    speedTier: tierInfo,
    speedUpgrade: upgradeProgress,
    achievements,
    permanentBenefits: user.total_recharge >= 1500
      ? ['全部 VIP 功能永久解锁']
      : user.total_recharge >= 500
        ? ['高级科学计算永久免费']
        : [],
    features: VIP_FEATURES,
    unlockedFeatures: vip ? VIP_FEATURES.map((f) => f.key) : [],
  };
}
