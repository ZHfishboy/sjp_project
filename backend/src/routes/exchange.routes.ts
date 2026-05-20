import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate, body, query } from '../middleware/validator';
import {
  getCurrencies,
  getLatestRates,
  convertCurrency,
  batchConvertCurrency,
  getRateTrend,
  createRateAlert,
  getRateAlerts,
  deleteRateAlert,
} from '../controllers/exchange.controller';

const router = Router();

// GET /api/v1/exchange/currencies
router.get('/currencies', getCurrencies);

// GET /api/v1/exchange/rates
router.get('/rates', getLatestRates);

// POST /api/v1/exchange/convert
router.post(
  '/convert',
  optionalAuth,
  validate([
    body('from').notEmpty().withMessage('请输入源货币'),
    body('to').notEmpty().withMessage('请输入目标货币'),
    body('amount').isNumeric().withMessage('请输入有效金额'),
  ]),
  convertCurrency,
);

// POST /api/v1/exchange/batch — batch convert
router.post(
  '/batch',
  optionalAuth,
  validate([
    body('from').notEmpty(),
    body('targets').isArray({ min: 2, max: 5 }),
    body('amount').isNumeric(),
  ]),
  batchConvertCurrency,
);

// GET /api/v1/exchange/trend?from=USD&to=CNY&days=7
router.get(
  '/trend',
  validate([
    query('from').notEmpty(),
    query('to').notEmpty(),
  ]),
  getRateTrend,
);

// POST /api/v1/exchange/alert — create rate alert (VIP)
router.post(
  '/alert',
  requireAuth,
  validate([
    body('fromCurrency').notEmpty(),
    body('toCurrency').notEmpty(),
    body('targetRate').isNumeric(),
    body('direction').isIn([1, 2]),
  ]),
  createRateAlert,
);

// GET /api/v1/exchange/alerts
router.get('/alerts', requireAuth, getRateAlerts);

// DELETE /api/v1/exchange/alert/:id
router.delete('/alert/:id', requireAuth, deleteRateAlert);

export default router;
