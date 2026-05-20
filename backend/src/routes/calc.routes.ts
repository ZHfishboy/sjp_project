import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { calcLimiter } from '../middleware/rateLimiter';
import { validate, body } from '../middleware/validator';
import {
  evaluateExpression,
  analyze,
  matrixCalc,
  solveEquation,
  baseConversion,
  calcStatistics,
  calcRegression,
  getHistory,
  deleteHistory,
  clearHistory,
  addFavorite,
  getFavorites,
  deleteFavorite,
} from '../controllers/calc.controller';

const router = Router();

router.use(calcLimiter);

// POST /api/v1/calc/evaluate — evaluates math expression (no auth required for basic)
router.post(
  '/evaluate',
  optionalAuth,
  validate([
    body('expression').notEmpty().withMessage('请输入计算表达式'),
  ]),
  evaluateExpression,
);

// POST /api/v1/calc/analyze — pre-check token cost
router.post('/analyze', optionalAuth, analyze);

// POST /api/v1/calc/matrix — matrix operations
router.post('/matrix', optionalAuth, matrixCalc);

// POST /api/v1/calc/equation — solve equations
router.post('/equation', optionalAuth, solveEquation);

// POST /api/v1/calc/base — number base conversion
router.post('/base', optionalAuth, baseConversion);

// POST /api/v1/calc/statistics — statistical analysis
router.post('/statistics', optionalAuth, calcStatistics);

// POST /api/v1/calc/regression — linear regression
router.post('/regression', optionalAuth, calcRegression);

// GET /api/v1/calc/history — calculation history
router.get('/history', requireAuth, getHistory);

// DELETE /api/v1/calc/history/:id — delete one history entry
router.delete('/history/:id', requireAuth, deleteHistory);

// DELETE /api/v1/calc/history — clear all history
router.delete('/history', requireAuth, clearHistory);

// POST /api/v1/calc/favorite — add to favorites
router.post('/favorite', requireAuth, addFavorite);

// GET /api/v1/calc/favorite — list favorites
router.get('/favorite', requireAuth, getFavorites);

// DELETE /api/v1/calc/favorite/:id — remove from favorites
router.delete('/favorite/:id', requireAuth, deleteFavorite);

export default router;
