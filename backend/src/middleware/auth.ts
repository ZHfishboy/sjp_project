import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';
import { db } from '../config/database';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      userId?: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, '请先登录');
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyAccessToken(token);
      if (payload.type !== 'access') {
        return unauthorized(res, '无效的访问令牌');
      }

      const user = await db('users').where({ id: payload.userId }).first();
      if (!user || user.status !== 1) {
        return unauthorized(res, '登录已失效，请重新登录');
      }

      req.user = payload;
      req.userId = payload.userId;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, '登录已过期，请重新登录');
      }
      return unauthorized(res, '无效的访问令牌');
    }
  })().catch(() => unauthorized(res, '无效的访问令牌'));
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  void (async () => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyAccessToken(token);
      if (payload.type === 'access') {
        const user = await db('users').where({ id: payload.userId }).first();
        if (user && user.status === 1) {
          req.user = payload;
          req.userId = payload.userId;
        }
      }
    } catch {
      // Ignore invalid tokens and continue as guest.
    }

    next();
  })().catch(() => next());
}

export async function requireVip(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    return unauthorized(res, '请先登录');
  }

  const vip = await db('user_vip')
    .where({ user_id: req.userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  if (!vip) {
    return forbidden(res, '此功能需要 VIP 会员，请先开通');
  }

  next();
}
