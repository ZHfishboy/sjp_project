import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, body } from '../middleware/validator';
import {
  getProfile,
  updateProfile,
  bindPhone,
  bindEmail,
  deleteAccount,
  restoreAccount,
} from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// GET /api/v1/user/profile
router.get('/profile', getProfile);

// PUT /api/v1/user/profile
router.put(
  '/profile',
  validate([
    body('nickname').optional().isLength({ max: 50 }).withMessage('昵称不能超过50个字符'),
  ]),
  updateProfile,
);

// POST /api/v1/user/bind-phone
router.post(
  '/bind-phone',
  validate([
    body('phone').notEmpty().withMessage('请输入手机号'),
    body('verifyCode').notEmpty().withMessage('请输入短信验证码'),
  ]),
  bindPhone,
);

// POST /api/v1/user/bind-email
router.post(
  '/bind-email',
  validate([
    body('email').isEmail().withMessage('请输入有效的邮箱'),
    body('verifyCode').notEmpty().withMessage('请输入验证码'),
  ]),
  bindEmail,
);

// DELETE /api/v1/user/account
router.delete('/account', deleteAccount);

// POST /api/v1/user/restore
router.post('/restore', restoreAccount);

export default router;
