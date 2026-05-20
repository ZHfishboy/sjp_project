import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { validate, body } from '../middleware/validator';
import { listCategories, convertOne, convertToAll } from '../controllers/unit.controller';

const router = Router();

// GET /api/v1/unit/categories
router.get('/categories', listCategories);

// POST /api/v1/unit/convert — single conversion
router.post(
  '/convert',
  optionalAuth,
  validate([
    body('value').isNumeric().withMessage('请输入有效数值'),
    body('fromUnit').notEmpty().withMessage('请输入源单位'),
    body('toUnit').notEmpty().withMessage('请输入目标单位'),
    body('category').notEmpty().withMessage('请输入换算类别'),
  ]),
  convertOne,
);

// POST /api/v1/unit/convert-all — convert to all units in category
router.post(
  '/convert-all',
  optionalAuth,
  validate([
    body('value').isNumeric(),
    body('fromUnit').notEmpty(),
    body('category').notEmpty(),
  ]),
  convertToAll,
);

export default router;
