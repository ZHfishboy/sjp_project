import { Request, Response } from 'express';
import { db } from '../config/database';
import { success, fail } from '../utils/response';
import {
  getRates,
  convert,
  batchConvert,
  getTrend,
  SUPPORTED_CURRENCIES,
} from '../services/exchange.service';
import redis from '../config/redis';

// Get all supported currencies
export async function getCurrencies(_req: Request, res: Response): Promise<void> {
  const list = Object.entries(SUPPORTED_CURRENCIES).map(([code, name]) => ({ code, name }));
  return success(res, list);
}

// Get latest rates
export async function getLatestRates(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getRates();
    return success(res, data);
  } catch (err: any) {
    return fail(res, err.message || '获取汇率失败');
  }
}

// Single conversion
export async function convertCurrency(req: Request, res: Response): Promise<void> {
  const { from, to, amount } = req.body;

  if (!from || !to || amount == null) {
    return fail(res, '请提供完整的换算参数（from, to, amount）');
  }

  // Rate limit check for free users
  if (req.userId) {
    const user = await db('users').where({ id: req.userId }).first();
    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();

    if (!vip && (user?.total_recharge || 0) < 500) {
      // Count free conversions today
      const todayKey = `exchange:free:${req.userId}:${new Date().toISOString().split('T')[0]}`;
      const count = parseInt((await redis.get(todayKey)) || '0', 10);
      const freeLimit = 10;

      if (count >= freeLimit) {
        // Check token balance
        const wallet = await db('user_wallet').where({ user_id: req.userId }).first();
        if (!wallet || wallet.token_balance < 1) {
          return fail(res, `今日免费换算次数已用完（${freeLimit}次/天），请充值计算币或升级 VIP`);
        }
        // Deduct 1 token
        await db('user_wallet').where({ user_id: req.userId }).update({
          token_balance: wallet.token_balance - 1,
          total_tokens_consumed: wallet.total_tokens_consumed + 1,
        });
      } else {
        await redis.incr(todayKey);
        await redis.expire(todayKey, 86400);
      }
    }
  } else {
    // Guest: limit 5 per day by IP
    const ip = req.ip || 'unknown';
    const guestKey = `exchange:guest:${ip}:${new Date().toISOString().split('T')[0]}`;
    const count = parseInt((await redis.get(guestKey)) || '0', 10);
    if (count >= 5) {
      return fail(res, '游客每日免费换算 5 次，请注册后继续使用');
    }
    await redis.incr(guestKey);
    await redis.expire(guestKey, 86400);
  }

  try {
    const result = await convert(from, to, amount);
    return success(res, result);
  } catch (err: any) {
    return fail(res, err.message || '汇率换算失败');
  }
}

// Batch conversion
export async function batchConvertCurrency(req: Request, res: Response): Promise<void> {
  const { from, targets, amount } = req.body;

  if (!from || !targets || !Array.isArray(targets) || amount == null) {
    return fail(res, '参数错误：需要 from, targets[], amount');
  }

  if (targets.length > 5) {
    return fail(res, '批量换算最多支持 5 种货币');
  }

  try {
    const results = await batchConvert(from, targets, amount);
    return success(res, results);
  } catch (err: any) {
    return fail(res, err.message || '批量换算失败');
  }
}

// Trend chart
export async function getRateTrend(req: Request, res: Response): Promise<void> {
  const { from, to, days = '7' } = req.query;
  const daysNum = parseInt(days as string, 10) || 7;

  if (!from || !to) {
    return fail(res, '请提供货币对（from, to）');
  }

  if (daysNum > 90) {
    return fail(res, '最多查询 90 天走势');
  }

  try {
    const trend = await getTrend(from as string, to as string, daysNum);
    return success(res, { from, to, days: daysNum, data: trend });
  } catch (err: any) {
    return fail(res, err.message || '获取走势失败');
  }
}

// Rate alert management
export async function createRateAlert(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { fromCurrency, toCurrency, targetRate, direction, notifyMethod = 1 } = req.body;

  if (!fromCurrency || !toCurrency || !targetRate || !direction) {
    return fail(res, '请提供完整的提醒参数');
  }

  const count = await db('rate_alerts').where({ user_id: userId, is_triggered: 0 }).count('* as total').first();
  if ((count as any)?.total >= 10) {
    return fail(res, '最多设置 10 个到价提醒');
  }

  await db('rate_alerts').insert({
    user_id: userId,
    from_currency: fromCurrency.toUpperCase(),
    to_currency: toCurrency.toUpperCase(),
    target_rate: targetRate,
    direction,
    notify_method: notifyMethod,
  });

  return success(res, null, '到价提醒已设置');
}

export async function getRateAlerts(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const alerts = await db('rate_alerts')
    .where({ user_id: userId })
    .select('*')
    .orderBy('created_at', 'desc');

  return success(res, alerts);
}

export async function deleteRateAlert(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { id } = req.params;

  await db('rate_alerts').where({ id: parseInt(id), user_id: userId }).del();

  return success(res, null, '已删除');
}
