import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, body, query } from '../middleware/validator';
import {
  getPlans,
  getStatus,
  createVipOrder,
  devPay,
  payCallback,
  getRechargeHistory,
  cancelAutoRenew,
  mySpeedTier,
  getConsumptionLog,
  preCheck,
} from '../controllers/vip.controller';

const router = Router();

// GET /api/v1/vip/plans — public
router.get('/plans', getPlans);

// GET /api/v1/vip/status — auth required
router.get('/status', requireAuth, getStatus);

// POST /api/v1/vip/order — create order
router.post(
  '/order',
  requireAuth,
  validate([
    body('type').isIn(['time', 'token', 'gift']).withMessage('订单类型无效'),
    body('planId').notEmpty().withMessage('请选择套餐'),
  ]),
  createVipOrder,
);

// GET /api/v1/vip/dev-pay/:orderNo — dev only
router.get('/dev-pay/:orderNo', devPay);

// POST /api/v1/vip/pay-callback — payment gateway callback
router.post('/pay-callback', payCallback);

// GET /api/v1/vip/recharge-history
router.get('/recharge-history', requireAuth, getRechargeHistory);

// POST /api/v1/vip/cancel-auto-renew
router.post('/cancel-auto-renew', requireAuth, cancelAutoRenew);

// ====================================================================
// Wallet / Token endpoints
// ====================================================================

// GET /api/v1/wallet/balance — included in /vip/status
// but also as standalone:
router.get('/wallet', requireAuth, getStatus);

// GET /api/v1/wallet/consumption-log
router.get('/consumption-log', requireAuth, getConsumptionLog);

// POST /api/v1/wallet/pre-check
router.post(
  '/pre-check',
  requireAuth,
  validate([
    body('operation').notEmpty().withMessage('请指定操作类型'),
  ]),
  preCheck,
);

export default router;
