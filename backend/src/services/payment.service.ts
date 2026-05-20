import { db } from '../config/database';
import { generateOrderNo } from '../utils/crypto';
import {
  TIME_PLANS,
  TOKEN_PLANS,
  GIFT_PACKS,
  addTokens,
  activateVip,
  updateSpeedTier,
  getSpeedTier,
  TimePlan,
  TokenPlan,
  GiftPack,
} from './vip.service';

// ====================================================================
// Order Creation
// ====================================================================

export type OrderType = 'time' | 'token' | 'gift';

export interface CreateOrderParams {
  userId: number;
  type: OrderType;
  planId: string;
  payChannel?: string;
}

export interface OrderResult {
  orderNo: string;
  amount: number;
  originalAmount: number;
  planName: string;
  payUrl?: string; // QR code URL for real payment
  simulated: boolean;
}

export async function createOrder(params: CreateOrderParams): Promise<OrderResult> {
  const { userId, type, planId, payChannel = 'alipay' } = params;

  let amount = 0;
  let originalAmount = 0;
  let tokensAwarded = 0;
  let vipDays = 0;
  let planName = '';
  let orderType: number;
  let giftPackId: string | null = null;

  switch (type) {
    case 'time': {
      const plan = TIME_PLANS.find((p) => p.id === planId);
      if (!plan || plan.price <= 0) throw new Error('无效的买时套餐');
      amount = plan.price;
      originalAmount = plan.originalPrice || plan.price;
      vipDays = plan.days;
      planName = plan.name;
      orderType = 1;
      break;
    }
    case 'token': {
      const plan = TOKEN_PLANS.find((p) => p.id === planId);
      if (!plan || plan.price <= 0) throw new Error('无效的买量套餐');
      amount = plan.price;
      originalAmount = plan.price;
      tokensAwarded = plan.tokens + plan.bonus;
      planName = plan.name;
      orderType = 2;
      break;
    }
    case 'gift': {
      const pack = GIFT_PACKS.find((p) => p.id === planId);
      if (!pack || pack.price <= 0) throw new Error('无效的首冲礼包');
      amount = pack.price;
      originalAmount = pack.originalPrice;
      tokensAwarded = pack.tokens;
      vipDays = pack.vipDays;
      planName = pack.name;
      orderType = 3;
      giftPackId = planId;
      break;
    }
    default:
      throw new Error('无效的订单类型');
  }

  const orderNo = generateOrderNo(
    type === 'time' ? 'CMT' : type === 'token' ? 'CMQ' : 'CMG',
  );

  // Check if this is user's first purchase
  const existingOrder = await db('recharge_orders')
    .where({ user_id: userId, pay_status: 1 })
    .first();
  const isFirstPurchase = !existingOrder;

  await db('recharge_orders').insert({
    user_id: userId,
    order_no: orderNo,
    order_type: orderType,
    plan_id: planId,
    amount,
    original_amount: originalAmount,
    tokens_awarded: tokensAwarded,
    vip_days: vipDays,
    pay_channel: payChannel,
    pay_status: 0,
    is_first_purchase: isFirstPurchase ? 1 : 0,
    gift_pack_id: giftPackId,
    created_at: new Date(),
  });

  // In production, generate real payment URL/QR code via WeChat/Alipay API
  // For development: simulate immediate payment
  const simulated = process.env.NODE_ENV === 'development';

  return {
    orderNo,
    amount,
    originalAmount,
    planName,
    payUrl: simulated ? `/api/v1/vip/dev-pay/${orderNo}` : undefined,
    simulated,
  };
}

// ====================================================================
// Process Payment (real callback or dev simulation)
// ====================================================================

export interface PaymentResult {
  success: boolean;
  orderNo: string;
  tokensAdded: number;
  vipDaysAdded: number;
  newTotalRecharge: number;
  newSpeedTier: number;
}

export async function processPayment(orderNo: string): Promise<PaymentResult> {
  const order = await db('recharge_orders').where({ order_no: orderNo }).first();
  if (!order) throw new Error('订单不存在');
  if (order.pay_status === 1) throw new Error('订单已支付');
  if (order.pay_status === 2) throw new Error('订单已退款');

  const userId = order.user_id;

  // Begin "transaction" (Knex supports transactions; simplified here)
  await db('recharge_orders').where({ id: order.id }).update({
    pay_status: 1,
    paid_at: new Date(),
  });

  // Update user total_recharge
  const user = await db('users').where({ id: userId }).first();
  const newTotalRecharge = Number(user.total_recharge) + Number(order.amount);
  await db('users').where({ id: userId }).update({
    total_recharge: newTotalRecharge,
    updated_at: new Date(),
  });

  // Award tokens
  if (order.tokens_awarded > 0) {
    await addTokens(userId, order.tokens_awarded, 'purchase');
  }

  // Activate VIP
  if (order.vip_days > 0) {
    await activateVip(
      userId,
      order.order_type === 1 ? TIME_PLANS.find((p) => p.id === order.plan_id)?.level || 1 : 0,
      order.vip_days,
    );
  }

  // Update speed tier
  await updateSpeedTier(userId, newTotalRecharge);

  // Handle first purchase gift tracking
  if (order.gift_pack_id) {
    await db('first_purchase_gift').insert({
      user_id: userId,
      gift_pack_id: order.gift_pack_id,
      order_id: order.id,
      popup_status: 2, // purchased
      created_at: new Date(),
    }).catch(() => {
      // May already exist; update
      return db('first_purchase_gift').where({ user_id: userId }).update({
        gift_pack_id: order.gift_pack_id,
        order_id: order.id,
        popup_status: 2,
      });
    });
  } else if (order.is_first_purchase) {
    // Mark first purchase regardless
    await db('first_purchase_gift').where({ user_id: userId }).where('popup_status', '!=', 2).insert({
      user_id: userId,
      popup_status: 2,
      created_at: new Date(),
    }).catch(() => {});
  }

  // Process invite rewards for first purchase
  if (order.is_first_purchase) {
    const invite = await db('user_invites')
      .where({ invitee_id: userId, is_valid: 1, status: 0 })
      .first();
    if (invite) {
      // Award inviter 20% of order amount in tokens
      const reward = Math.floor(order.amount * 0.2);
      if (reward > 0) {
        await db('user_wallet')
          .where({ user_id: invite.inviter_id })
          .increment('token_balance', reward)
          .increment('total_tokens_earned', reward);
      }

      await db('user_invites').where({ id: invite.id }).update({
        invitee_first_recharge_at: new Date(),
        invitee_total_recharge: order.amount,
        status: 1,
        inviter_reward_tokens: reward,
      });
    }
  }

  const tierInfo = getSpeedTier(newTotalRecharge);

  return {
    success: true,
    orderNo,
    tokensAdded: order.tokens_awarded,
    vipDaysAdded: order.vip_days,
    newTotalRecharge,
    newSpeedTier: tierInfo.tier,
  };
}
