import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';
import { db } from '../config/database';

// Extend Express Request to carry user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      userId?: number;
    }
  }
}

/**
 * Required auth — returns 401 if no valid token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
    req.user = payload;
    req.userId = payload.userId;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, '登录已过期，请重新登录');
    }
    return unauthorized(res, '无效的访问令牌');
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't block.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    if (payload.type === 'access') {
      req.user = payload;
      req.userId = payload.userId;
    }
  } catch {
    // Ignore — proceed as guest
  }
  next();
}

/**
 * VIP-only middleware — requires active VIP subscription.
 * Must be used AFTER requireAuth.
 */
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
