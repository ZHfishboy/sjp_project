import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, body } from '../middleware/validator';
import {
  register,
  login,
  logout,
  refresh,
  resetPassword,
  sendVerifyCode,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Rate limit on all auth routes
router.use(authLimiter);

// POST /api/v1/auth/register
router.post(
  '/register',
  validate([
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('用户名长度应为3-50位'),
    body('password').isLength({ min: 8 }).withMessage('密码至少8位'),
  ]),
  register,
);

// POST /api/v1/auth/login
router.post(
  '/login',
  validate([
    body('account').notEmpty().withMessage('请输入账号'),
  ]),
  login,
);

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, logout);

// POST /api/v1/auth/refresh
router.post('/refresh', refresh);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate([
    body('account').notEmpty().withMessage('请输入账号'),
    body('verifyCode').notEmpty().withMessage('请输入验证码'),
    body('newPassword').isLength({ min: 8 }).withMessage('新密码至少8位'),
  ]),
  resetPassword,
);

// POST /api/v1/auth/send-code
router.post(
  '/send-code',
  validate([
    body('target').notEmpty().withMessage('请输入手机号或邮箱'),
    body('type').isIn(['sms', 'email']).withMessage('类型错误'),
  ]),
  sendVerifyCode,
);

export default router;
