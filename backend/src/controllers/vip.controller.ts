import { Request, Response } from 'express';
import { db } from '../config/database';
import { success, fail } from '../utils/response';
import {
  TIME_PLANS,
  TOKEN_PLANS,
  GIFT_PACKS,
  VIP_FEATURES,
  getVipStatus,
  getSpeedTier,
  getUpgradeProgress,
  getAchievements,
} from '../services/vip.service';
import { createOrder, processPayment } from '../services/payment.service';
import { analyzeExpression } from '../services/expression.service';
import { isPremiumCategory } from '../services/unit.service';
import { paginated } from '../utils/response';

// ====================================================================
// Get all plans
// ====================================================================
export async function getPlans(_req: Request, res: Response): Promise<void> {
  return success(res, {
    timePlans: TIME_PLANS,
    tokenPlans: TOKEN_PLANS,
    giftPacks: GIFT_PACKS,
    features: VIP_FEATURES,
  });
}

// ====================================================================
// Get VIP status + wallet + tier + achievements
// ====================================================================
export async function getStatus(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  try {
    const status = await getVipStatus(userId);
    return success(res, status);
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Create order
// ====================================================================
export async function createVipOrder(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { type, planId, payChannel } = req.body;

  if (!type || !planId) {
    return fail(res, '请选择套餐类型和套餐 ID');
  }

  if (!['time', 'token', 'gift'].includes(type)) {
    return fail(res, '无效的订单类型，可选值：time / token / gift');
  }

  try {
    const order = await createOrder({ userId, type, planId, payChannel });

    // In development: auto-complete payment
    if (order.simulated) {
      const payment = await processPayment(order.orderNo);
      return success(res, {
        order,
        payment,
        message: '支付成功（开发环境模拟）',
      });
    }

    return success(res, { order }, '订单已创建，请完成支付');
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Dev payment simulation
// ====================================================================
export async function devPay(req: Request, res: Response): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return fail(res, '仅开发环境可用', 404);
  }

  const { orderNo } = req.params;
  try {
    const result = await processPayment(orderNo);
    return success(res, result, '支付成功（开发环境）');
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Payment callback (third-party gateway)
// ====================================================================
export async function payCallback(req: Request, res: Response): Promise<void> {
  // In production: verify signature from WeChat/Alipay, then process
  const { order_no, sign } = req.body;

  // TODO: verify payment gateway signature
  console.log('[PayCallback]', { order_no, sign });

  if (!order_no) {
    return fail(res, '缺少订单号');
  }

  try {
    const result = await processPayment(order_no);
    return success(res, result, '支付确认成功');
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Recharge history
// ====================================================================
export async function getRechargeHistory(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

  const totalQuery = db('recharge_orders')
    .where({ user_id: userId })
    .count('* as total')
    .first();

  const dataQuery = db('recharge_orders')
    .where({ user_id: userId })
    .select(
      'order_no',
      'order_type',
      'plan_id',
      'amount',
      'original_amount',
      'tokens_awarded',
      'vip_days',
      'pay_channel',
      'pay_status',
      'paid_at',
      'created_at',
    )
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const [totalResult, list] = await Promise.all([totalQuery, dataQuery]);
  const total = (totalResult as any)?.total || 0;

  return paginated(res, list, total, page, pageSize);
}

// ====================================================================
// Cancel auto-renew
// ====================================================================
export async function cancelAutoRenew(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;

  const vip = await db('user_vip')
    .where({ user_id: userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  if (!vip) {
    return fail(res, '没有生效中的 VIP');
  }

  await db('user_vip').where({ id: vip.id }).update({ auto_renew: 0 });

  return success(res, null, '已取消自动续费');
}

// ====================================================================
// Speed tier info
// ====================================================================
export async function mySpeedTier(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const user = await db('users').where({ id: userId }).first();

  if (!user) return fail(res, '用户不存在', 404);

  const tier = getSpeedTier(user.total_recharge);
  const progress = getUpgradeProgress(user.total_recharge);
  const achievements = getAchievements(user.total_recharge);

  return success(res, { tier, upgradeProgress: progress, achievements });
}

// ====================================================================
// Token consumption log
// ====================================================================
export async function getConsumptionLog(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

  const totalQuery = db('token_consumption_log')
    .where({ user_id: userId })
    .count('* as total')
    .first();

  const dataQuery = db('token_consumption_log')
    .where({ user_id: userId })
    .select('*')
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const [totalResult, list] = await Promise.all([totalQuery, dataQuery]);
  const total = (totalResult as any)?.total || 0;

  return paginated(res, list, total, page, pageSize);
}

// ====================================================================
// Pre-check: how many tokens an operation costs
// ====================================================================

export async function preCheck(req: Request, res: Response): Promise<void> {
  const { operation, expression } = req.body;
  const userId = req.userId!;

  // Check if user has active VIP (free)
  const vip = await db('user_vip')
    .where({ user_id: userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  if (vip) {
    return success(res, { tokensNeeded: 0, message: 'VIP 用户免消耗' });
  }

  const user = await db('users').where({ id: userId }).first();
  if ((user?.total_recharge || 0) >= 500) {
    return success(res, { tokensNeeded: 0, message: '高级科学计算已永久解锁' });
  }

  let tokensNeeded = 0;
  if (operation === 'expression' && expression) {
    tokensNeeded = analyzeExpression(expression).tokens;
  } else if (operation === 'exchange_batch') {
    tokensNeeded = 3;
  } else if (operation === 'exchange_trend') {
    tokensNeeded = 2;
  } else if (operation?.startsWith('unit_')) {
    tokensNeeded = isPremiumCategory(operation.replace('unit_', '')) ? 1 : 0;
  }

  const wallet = await db('user_wallet').where({ user_id: userId }).first();
  const balance = wallet?.token_balance || 0;

  return success(res, {
    tokensNeeded,
    balance,
    sufficient: balance >= tokensNeeded,
    message: balance >= tokensNeeded ? '余额充足' : `余额不足，需要 ${tokensNeeded} 计算币`,
  });
}
