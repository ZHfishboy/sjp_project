import { Router } from 'express';
import { captchaLimiter } from '../middleware/rateLimiter';
import { validate, query, body } from '../middleware/validator';
import { getCaptcha, verify } from '../controllers/captcha.controller';

const router = Router();

router.use(captchaLimiter);

// GET /api/v1/captcha/image?type=image|arithmetic|slider|click
router.get(
  '/image',
  validate([
    query('type').optional().isIn(['image', 'arithmetic', 'slider', 'click']).withMessage('验证码类型无效'),
  ]),
  getCaptcha,
);

// POST /api/v1/captcha/verify
router.post(
  '/verify',
  validate([
    body('captchaId').notEmpty().withMessage('缺少验证码ID'),
  ]),
  verify,
);

export default router;
