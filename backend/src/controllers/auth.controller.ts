import { Request, Response } from 'express';
import { db } from '../config/database';
import { hashPassword, verifyPassword, generateInviteCode } from '../utils/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { success, fail, unauthorized } from '../utils/response';
import { verifyCaptcha, generateVerificationCode, verifyCode, canSendCode } from '../services/captcha.service';
import redis from '../config/redis';
import { sendSMS } from '../services/sms.service';

function validatePassword(password: string) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 20;
}

async function findActiveUserById(userId: number) {
  return db('users').where({ id: userId, status: 1 }).first();
}

export async function register(req: Request, res: Response): Promise<void> {
  const { username, password, email, phone, captchaId, captchaAnswer, inviteCode } = req.body;

  if (!username || !password) {
    return fail(res, '用户名和密码不能为空');
  }

  if (username.length < 3 || username.length > 50) {
    return fail(res, '用户名长度应为 3-50 位');
  }

  if (!validatePassword(password)) {
    return fail(res, '密码需要 8-20 位');
  }

  if (captchaId && captchaAnswer) {
    const captchaValid = await verifyCaptcha({ captchaId, answer: captchaAnswer });
    if (!captchaValid) {
      return fail(res, '验证码错误或已过期');
    }
  }

  const passwordHash = await hashPassword(password);
  const myInviteCode = generateInviteCode();

  let invitedBy: number | null = null;
  if (inviteCode) {
    const inviter = await db('users').where({ invite_code: inviteCode, status: 1 }).first();
    if (inviter) invitedBy = inviter.id;
  }

  try {
    const [userId] = await db('users').insert({
      username,
      password_hash: passwordHash,
      email: email || null,
      phone: phone || null,
      invite_code: myInviteCode,
      invited_by: invitedBy,
      status: 1,
    });

    await db('user_wallet').insert({
      user_id: userId,
      token_balance: 50,
      total_tokens_earned: 50,
    });

    await db('user_rate_tier').insert({
      user_id: userId,
      tier: 3,
      delay_ms: 3000,
      max_concurrency: 1,
    });

    if (invitedBy) {
      await db('user_invites').insert({
        inviter_id: invitedBy,
        invitee_id: userId,
        invite_code: inviteCode,
        invitee_registered_at: new Date(),
        status: 0,
        is_valid: 1,
      });

      await db('user_wallet').where({ user_id: invitedBy }).increment('token_balance', 10);
      await db('user_wallet').where({ user_id: invitedBy }).increment('total_tokens_earned', 10);
    }

    const tokenPayload = { userId, username };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    return success(res, {
      userId,
      username,
      accessToken,
      refreshToken,
      inviteCode: myInviteCode,
      tokenBalance: 50,
    }, '注册成功', 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      if (err.message.includes('username')) return fail(res, '用户名已存在', 409);
      if (err.message.includes('email')) return fail(res, '邮箱已被注册', 409);
      if (err.message.includes('phone')) return fail(res, '手机号已被注册', 409);
      return fail(res, '用户已存在', 409);
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { account, password, captchaId, captchaAnswer, loginType } = req.body;

  if (!account) {
    return fail(res, '请输入账号');
  }

  const failKey = `login_fail:${account}`;
  const failCount = parseInt((await redis.get(failKey)) || '0', 10);

  if (failCount >= 3) {
    if (!captchaId || !captchaAnswer) {
      return fail(res, '请完成图形验证码', 400, { requireCaptcha: true });
    }
    const captchaValid = await verifyCaptcha({ captchaId, answer: captchaAnswer });
    if (!captchaValid) {
      return fail(res, '验证码错误或已过期', 400, { requireCaptcha: true });
    }
  }

  const user = await db('users')
    .where(function () {
      this.where('username', account).orWhere('email', account).orWhere('phone', account);
    })
    .where('status', '!=', 0)
    .first();

  if (!user) {
    await redis.incr(failKey);
    await redis.expire(failKey, 1800);
    return fail(res, '账号或密码错误');
  }

  if (user.status === 2) {
    return fail(res, '账号正在注销中，请重新登录以恢复账号');
  }

  if (loginType === 'sms') {
    const code = req.body.verifyCode;
    if (!code) return fail(res, '请输入短信验证码');
    const valid = await verifyCode(user.phone || account, 'sms', code);
    if (!valid) {
      await redis.incr(failKey);
      await redis.expire(failKey, 1800);
      return fail(res, '短信验证码错误或已过期');
    }
  } else {
    if (!password) return fail(res, '请输入密码');
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await redis.incr(failKey);
      await redis.expire(failKey, 1800);
      return fail(res, '账号或密码错误');
    }
  }

  await redis.del(failKey);

  try {
    await db('login_logs').insert({
      user_id: user.id,
      login_type: loginType === 'sms' ? 2 : 1,
      ip_address: req.ip || req.socket.remoteAddress,
      device_info: req.headers['user-agent'] || '',
      is_abnormal: 0,
    });
  } catch {}

  const tokenPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  const wallet = await db('user_wallet').where({ user_id: user.id }).first();
  const vip = await db('user_vip')
    .where({ user_id: user.id, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  return success(res, {
    userId: user.id,
    username: user.username,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    accessToken,
    refreshToken,
    tokenBalance: wallet?.token_balance || 0,
    totalRecharge: user.total_recharge,
    vipLevel: vip?.level || null,
    vipExpiresAt: vip?.end_date || null,
    requireCaptcha: failCount >= 3,
  }, '登录成功');
}

export async function logout(_req: Request, res: Response): Promise<void> {
  return success(res, null, '已退出登录');
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return unauthorized(res, '请提供刷新令牌');
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== 'refresh') {
      return unauthorized(res, '无效的刷新令牌');
    }

    const user = await findActiveUserById(payload.userId);
    if (!user) {
      return unauthorized(res, '登录已失效，请重新登录');
    }

    const tokenPayload = { userId: payload.userId, username: payload.username };
    return success(res, {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
    }, '令牌刷新成功');
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, '刷新令牌已过期，请重新登录');
    }
    return unauthorized(res, '无效的刷新令牌');
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { account, verifyCode: inputCode, newPassword, captchaId, captchaAnswer } = req.body;

  if (!account || !inputCode || !newPassword) {
    return fail(res, '请填写完整信息');
  }

  if (!validatePassword(newPassword)) {
    return fail(res, '新密码需要 8-20 位');
  }

  if (captchaId && captchaAnswer) {
    const valid = await verifyCaptcha({ captchaId, answer: captchaAnswer });
    if (!valid) return fail(res, '验证码错误或已过期');
  }

  const user = await db('users')
    .where(function () {
      this.where('email', account).orWhere('phone', account);
    })
    .first();

  if (!user) {
    return fail(res, '账号不存在');
  }

  const isEmail = account.includes('@');
  const valid = await verifyCode(account, isEmail ? 'email' : 'sms', inputCode);
  if (!valid) {
    return fail(res, '验证码错误或已过期');
  }

  await db('users').where({ id: user.id }).update({
    password_hash: await hashPassword(newPassword),
    updated_at: new Date(),
  });

  return success(res, null, '密码重置成功，请使用新密码登录');
}

export async function sendVerifyCode(req: Request, res: Response): Promise<void> {
  const { target, type, captchaId, captchaAnswer } = req.body;

  if (!target || !type) {
    return fail(res, '参数不完整');
  }

  const { allowed, retryAfter } = await canSendCode(target, type);
  if (!allowed) {
    return fail(res, `操作过于频繁，请 ${retryAfter} 秒后再试`, 429);
  }

  if (captchaId && captchaAnswer) {
    const valid = await verifyCaptcha({ captchaId, answer: captchaAnswer });
    if (!valid) return fail(res, '验证码错误或已过期');
  }

  const { code, expireSeconds } = await generateVerificationCode(target, type);

  if (type === 'sms') {
    await sendSMS(target, code);
  } else {
    console.log(`[Email] To: ${target} | Code: ${code}`);
  }

  return success(res, {
    target,
    type,
    expireSeconds,
    ...(process.env.NODE_ENV === 'development' ? { code } : {}),
  }, '验证码已发送');
}
