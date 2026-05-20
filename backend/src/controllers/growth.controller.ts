import { Request, Response } from 'express';
import { db } from '../config/database';
import { success, fail, paginated } from '../utils/response';
import { generateInviteCode } from '../utils/crypto';
import { GIFT_PACKS, getOrCreateWallet, addTokens, activateVip } from '../services/vip.service';

// ====================================================================
// SECTION 1: First-Purchase Gift Pack (首冲大礼包)
// ====================================================================

// Check if user is eligible for gift pack popup
export async function checkGiftEligibility(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const user = await db('users').where({ id: userId }).first();

  if (!user || user.status !== 1) {
    return fail(res, '用户不存在', 404);
  }

  // Check if user has ever paid
  const anyOrder = await db('recharge_orders')
    .where({ user_id: userId, pay_status: 1 })
    .first();

  if (anyOrder) {
    return success(res, { eligible: false, reason: '已充值过，首冲礼包已失效' });
  }

  // Check registration time (must be > 1 hour ago)
  const hoursSinceReg = (Date.now() - new Date(user.created_at).getTime()) / 3600000;
  if (hoursSinceReg < 1) {
    return success(res, { eligible: false, reason: '注册不足1小时' });
  }

  // Check popup status
  const record = await db('first_purchase_gift').where({ user_id: userId }).first();

  if (record && record.popup_status === 2) {
    return success(res, { eligible: false, reason: '已购买' });
  }

  if (record && record.popup_status === 3) {
    // User dismissed ("heartless reject")
    const dismissedAt = new Date(record.popup_dismissed_at);
    const hoursSinceDismiss = (Date.now() - dismissedAt.getTime()) / 3600000;
    if (hoursSinceDismiss < 72) {
      return success(res, {
        eligible: false,
        reason: '已拒绝，72小时内不再展示',
        retryAfterHours: Math.ceil(72 - hoursSinceDismiss),
      });
    }
  }

  if (record && record.popup_status === 1) {
    // Shown before, check 24h cooldown
    const shownAt = new Date(record.popup_shown_at);
    const hoursSinceShown = (Date.now() - shownAt.getTime()) / 3600000;
    if (hoursSinceShown < 24) {
      return success(res, {
        eligible: false,
        reason: '24小时内已展示过',
        retryAfterHours: Math.ceil(24 - hoursSinceShown),
      });
    }
  }

  return success(res, {
    eligible: true,
    giftPacks: GIFT_PACKS,
    message: '首冲大礼包可用',
  });
}

// Record popup shown
export async function recordGiftShown(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const existing = await db('first_purchase_gift').where({ user_id: userId }).first();
  if (existing) {
    await db('first_purchase_gift').where({ user_id: userId }).update({
      popup_shown_at: new Date(),
      popup_status: 1,
    });
  } else {
    await db('first_purchase_gift').insert({
      user_id: userId,
      popup_shown_at: new Date(),
      popup_status: 1,
    });
  }

  return success(res, null, '已记录');
}

// User dismisses popup ("残忍拒绝")
export async function dismissGiftPopup(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const existing = await db('first_purchase_gift').where({ user_id: userId }).first();
  if (existing) {
    await db('first_purchase_gift').where({ user_id: userId }).update({
      popup_dismissed_at: new Date(),
      popup_status: 3, // rejected
    });
  } else {
    await db('first_purchase_gift').insert({
      user_id: userId,
      popup_dismissed_at: new Date(),
      popup_status: 3,
    });
  }

  return success(res, null, '已记录');
}

// ====================================================================
// SECTION 2: Invite Friends (邀请好友)
// ====================================================================

// Get my invite code & stats
export async function getMyInviteInfo(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const user = await db('users').where({ id: userId }).first();
  if (!user || user.status !== 1) {
    return fail(res, '用户不存在', 404);
  }

  // Count my invitees
  const inviteCount = await db('user_invites')
    .where({ inviter_id: userId, is_valid: 1 })
    .count('* as total')
    .first();

  const total = (inviteCount as any)?.total || 0;

  // Calculate milestone progress
  const milestones = [
    { count: 5, reward: '200 计算币 + 人脉大师徽章', earned: total >= 5 },
    { count: 20, reward: '1000 计算币 + 月度 VIP', earned: total >= 20 },
    { count: 50, reward: '5000 计算币 + 年度 VIP + 意见领袖金色徽章', earned: total >= 50 },
  ];

  const nextMilestone = milestones.find((m) => !m.earned) || null;

  return success(res, {
    inviteCode: user.invite_code,
    inviteeCount: total,
    milestones,
    nextMilestone,
    shareText: `我用高级效率计算器算了一笔账，这个计算器太强了！用我的邀请码 ${user.invite_code} 注册，咱俩都能拿计算币 👇`,
  });
}

// Get my invitee list
export async function getMyInvitees(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

  const totalQuery = db('user_invites')
    .where({ inviter_id: userId })
    .count('* as total')
    .first();

  const dataQuery = db('user_invites')
    .where({ inviter_id: userId })
    .select(
      'user_invites.id',
      'user_invites.status',
      'user_invites.invitee_total_recharge',
      'user_invites.inviter_reward_tokens',
      'user_invites.is_valid',
      'user_invites.created_at',
      'u.username as invitee_username',
    )
    .leftJoin('users as u', 'user_invites.invitee_id', 'u.id')
    .orderBy('user_invites.created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const [totalResult, list] = await Promise.all([totalQuery, dataQuery]);
  const total = (totalResult as any)?.total || 0;

  return paginated(res, list, total, page, pageSize);
}

// ====================================================================
// SECTION 3: Exit Intent (退出挽留)
// ====================================================================

// Copy library (per PRD 3.12.2)
const EXIT_COPIES = {
  generic: [
    { id: 'exit_1', text: '求求你了主人，你真的要退出吗？🥺' },
    { id: 'exit_2', text: '别走啊！我还有好多功能你没试过呢～' },
    { id: 'exit_3', text: '主人，你是不是外面有别的计算器了？😭' },
    { id: 'exit_4', text: '等等！你今天的运势还没算呢！' },
    { id: 'exit_5', text: '真的要丢下我吗……我会想你的 💔' },
  ],
  nonPayer: [
    { id: 'exit_6', text: '先别走！送你 30 计算币，明天再来试试？' },
    { id: 'exit_7', text: '还在用龟速模式吗？充 ¥1 就能加速哦！' },
    { id: 'exit_8', text: '首冲只要 ¥1，告别龟速计算 🐢→⚡' },
  ],
  inProgress: [
    { id: 'exit_9', text: '你还有计算结果没保存呢，确定要走？' },
    { id: 'exit_10', text: '汇率到价提醒还没设置完哦～' },
  ],
};

export async function getExitCopy(req: Request, res: Response): Promise<void> {
  let userType = 0; // 0=guest, 1=registered, 2=VIP
  let isPayer = false;

  if (req.userId) {
    userType = 1;
    const user = await db('users').where({ id: req.userId }).first();
    if (user && user.total_recharge > 0) isPayer = true;

    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();
    if (vip) userType = 2;
  }

  // Select copy pool based on user type
  let pool = [...EXIT_COPIES.generic];
  if (!isPayer && userType !== 2) {
    pool = [...pool, ...EXIT_COPIES.nonPayer];
  }
  if (userType > 0) {
    pool = [...pool, ...EXIT_COPIES.inProgress];
  }

  // Random pick
  const copy = pool[Math.floor(Math.random() * pool.length)];

  return success(res, {
    copyId: copy.id,
    copyText: copy.text,
    userType,
    showRechargeCTA: !isPayer && userType !== 2,
  });
}

// Log exit intent behavior
export async function logExitIntent(req: Request, res: Response): Promise<void> {
  const { copyId, copyText, userAction, sessionDuration } = req.body;

  let userType = 0;
  if (req.userId) {
    userType = 1;
    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();
    if (vip) userType = 2;
  }

  await db('exit_intent_log').insert({
    user_id: req.userId || null,
    copy_id: copyId || 'unknown',
    copy_text: copyText || '',
    user_action: userAction || 0,
    session_duration: sessionDuration || 0,
    user_type: userType,
  });

  return success(res, null);
}

// ====================================================================
// SECTION 4: Splash Popup Ads (开屏弹窗广告)
// ====================================================================

// Popup definitions
const SPLASH_POPUPS = [
  {
    index: 1,
    type: 'welcome',
    title: '欢迎来到高级效率计算器！',
    subtitle: '注册即送 50 计算币 + 3 天 VIP 体验',
    ctaText: '立即注册',
    ctaLink: '/register',
    closable: true,
  },
  {
    index: 2,
    type: 'first_purchase',
    title: '首冲仅需 ¥1',
    subtitle: '告别龟速 🐢，体验 ⚡ 闪电模式',
    ctaText: '去充值',
    ctaLink: '/vip',
    closable: true,
  },
  {
    index: 3,
    type: 'invite',
    title: '邀请好友一起用',
    subtitle: '双方各得计算币，最高赚 ¥5000',
    ctaText: '邀请好友',
    ctaLink: '/invite',
    closable: true,
  },
  {
    index: 4,
    type: 'vip_promo',
    title: '🔥 年度 VIP 限时优惠',
    subtitle: '仅需 ¥88，立省 ¥110，解锁全部功能',
    ctaText: '立即购买',
    ctaLink: '/vip',
    closable: true,
  },
  {
    index: 5,
    type: 'ultimate',
    title: '🎁 充值任意金额',
    subtitle: '立即解锁全部高级功能',
    ctaText: '去充值',
    ctaLink: '/vip',
    closable: false, // Requires 3 clicks
    threeClickCopy: [
      '哎呀，点一下可关不掉哦～ 😝',
      '真的不看看吗？充值 ¥1 就能加速 ⚡',
      null, // 3rd click = redirect to recharge
    ],
    threeClickButtons: ['再试试', '好吧，去看看', null],
  },
];

export async function getSplashPopups(req: Request, res: Response): Promise<void> {
  let userType = 0;
  let isPayer = false;
  let isNewUser = false;

  if (req.userId) {
    const user = await db('users').where({ id: req.userId }).first();
    if (user && user.status === 1) {
      userType = 1;
      if (user.total_recharge > 0) isPayer = true;

      const daysSinceReg = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
      isNewUser = daysSinceReg < 3;

      const vip = await db('user_vip')
        .where({ user_id: req.userId, status: 1 })
        .where(function () {
          this.whereNull('end_date').orWhere('end_date', '>', new Date());
        })
        .first();
      if (vip) userType = 2;
    }
  }

  // Filter popups based on user type
  let popups = [...SPLASH_POPUPS];

  // Paid users: no splash ads
  if (isPayer || userType === 2) {
    return success(res, { popups: [], reason: 'paid_user_exempt' });
  }

  // Logged-in users: skip the welcome/register popup (index 1)
  if (userType >= 1) {
    popups = popups.filter((p) => p.index !== 1);
  }

  // New users (< 3 days): only first 3 popups (after filtering out welcome)
  if (isNewUser && userType === 1) {
    popups = popups.filter((p) => p.index <= 3);
  }

  // Guests: show all but CTA links redirect to register
  if (userType === 0) {
    popups = popups.map((p) => ({
      ...p,
      ctaLink: p.index === 1 ? '/register' : '/register',
    }));
  }

  return success(res, {
    popups,
    totalCount: popups.length,
    threeClickEnabled: popups.some((p) => p.index === 5),
    countdownSeconds: 3,
  });
}

// Log splash popup behavior
export async function logSplashPopup(req: Request, res: Response): Promise<void> {
  const { sessionId, popupIndex, popupType, action } = req.body;

  let userType = 0;
  if (req.userId) {
    userType = 1;
    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();
    if (vip) userType = 2;
  }

  await db('splash_popup_log').insert({
    user_id: req.userId || null,
    session_id: sessionId || 'unknown',
    popup_index: popupIndex,
    popup_type: popupType || 'unknown',
    action: action || 1, // 1=shown, 2=closed, 3=skip_all, 4=CTA, 5=click1, 6=click2, 7=click3
    user_type: userType,
  });

  return success(res, null);
}
