import { Request, Response } from 'express';
import { db } from '../config/database';
import { success, fail, forbidden } from '../utils/response';
import { verifyCode } from '../services/captcha.service';

// ====================================================================
// Get Profile
// ====================================================================
export async function getProfile(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const user = await db('users')
    .select(
      'id',
      'username',
      'email',
      'phone',
      'avatar_url',
      'nickname',
      'invite_code',
      'total_recharge',
      'status',
      'created_at',
    )
    .where({ id: userId })
    .first();

  if (!user) {
    return fail(res, '用户不存在', 404);
  }

  // Wallet
  const wallet = await db('user_wallet').where({ user_id: userId }).first();

  // VIP
  const vip = await db('user_vip')
    .where({ user_id: userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  // Rate tier
  const rateTier = await db('user_rate_tier').where({ user_id: userId }).first();

  return success(res, {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    nickname: user.nickname,
    inviteCode: user.invite_code,
    totalRecharge: user.total_recharge,
    status: user.status,
    createdAt: user.created_at,
    wallet: wallet
      ? {
          tokenBalance: wallet.token_balance,
          totalPurchased: wallet.total_tokens_purchased,
          totalConsumed: wallet.total_tokens_consumed,
          totalEarned: wallet.total_tokens_earned,
        }
      : null,
    vip: vip
      ? {
          level: vip.level,
          startDate: vip.start_date,
          endDate: vip.end_date,
          autoRenew: !!vip.auto_renew,
        }
      : null,
    rateTier: rateTier
      ? {
          tier: rateTier.tier,
          delayMs: rateTier.delay_ms,
          maxConcurrency: rateTier.max_concurrency,
        }
      : null,
  });
}

// ====================================================================
// Update Profile
// ====================================================================
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { nickname, avatarUrl } = req.body;

  const updates: Record<string, any> = { updated_at: new Date() };
  if (nickname !== undefined) {
    if (nickname.length > 50) return fail(res, '昵称不能超过50个字符');
    updates.nickname = nickname;
  }
  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }

  if (Object.keys(updates).length <= 1) {
    return fail(res, '没有需要更新的内容');
  }

  await db('users').where({ id: userId }).update(updates);

  return success(res, null, '个人信息已更新');
}

// ====================================================================
// Bind Phone
// ====================================================================
export async function bindPhone(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { phone, verifyCode: inputCode } = req.body;

  if (!phone || !inputCode) {
    return fail(res, '请填写完整信息');
  }

  // Check if phone already bound to another account
  const existing = await db('users').where({ phone }).whereNot({ id: userId }).first();
  if (existing) {
    return fail(res, '该手机号已被其他账号绑定');
  }

  const valid = await verifyCode(phone, 'sms', inputCode);
  if (!valid) {
    return fail(res, '短信验证码错误或已过期');
  }

  await db('users').where({ id: userId }).update({ phone, updated_at: new Date() });

  return success(res, { phone }, '手机号绑定成功');
}

// ====================================================================
// Bind Email
// ====================================================================
export async function bindEmail(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { email, verifyCode: inputCode } = req.body;

  if (!email || !inputCode) {
    return fail(res, '请填写完整信息');
  }

  const existing = await db('users').where({ email }).whereNot({ id: userId }).first();
  if (existing) {
    return fail(res, '该邮箱已被其他账号绑定');
  }

  const valid = await verifyCode(email, 'email', inputCode);
  if (!valid) {
    return fail(res, '邮箱验证码错误或已过期');
  }

  await db('users').where({ id: userId }).update({ email, updated_at: new Date() });

  return success(res, { email }, '邮箱绑定成功');
}

// ====================================================================
// Delete Account (7-day cooling off)
// ====================================================================
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const user = await db('users').where({ id: userId }).first();
  if (!user) {
    return fail(res, '用户不存在', 404);
  }

  if (user.status === 2) {
    return fail(res, '账号已在注销中，将于7天后永久删除');
  }

  // Set status to 2 (pending deletion)
  await db('users').where({ id: userId }).update({
    status: 2,
    updated_at: new Date(),
  });

  // Schedule: in production, a cron job deletes users with status=2
  // where updated_at > 7 days ago.

  const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return success(res, {
    deletionDate: deletionDate.toISOString(),
    message: '账号已进入7天注销冷静期。在此期间重新登录将自动恢复账号。',
  }, '账号注销申请已提交');
}

// ====================================================================
// Restore Account (during cooling-off period)
// ====================================================================
export async function restoreAccount(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const user = await db('users').where({ id: userId }).first();
  if (!user || user.status !== 2) {
    return fail(res, '账号未在注销中');
  }

  await db('users').where({ id: userId }).update({
    status: 1,
    updated_at: new Date(),
  });

  return success(res, null, '账号已恢复');
}
