import { Router, Request, Response } from 'express';
import { success } from '../utils/response';
import { config } from '../config';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import captchaRoutes from './captcha.routes';
import calcRoutes from './calc.routes';
import exchangeRoutes from './exchange.routes';
import unitRoutes from './unit.routes';
import vipRoutes from './vip.routes';
import growthRoutes from './growth.routes';

const router = Router();

// ── Health Check ──
router.get('/health', (_req: Request, res: Response) => {
  success(res, {
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

// ── Step 2: Auth, User, Captcha ──
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/captcha', captchaRoutes);

// ── Step 3: Calculation, Exchange, Unit ──
router.use('/calc', calcRoutes);
router.use('/exchange', exchangeRoutes);
router.use('/unit', unitRoutes);

// ── Step 4: VIP / Payment / Wallet ──
router.use('/vip', vipRoutes);

// ── Step 5: Growth Operations (Gift / Invite / Exit / Splash) ──
router.use(growthRoutes);

export default router;
