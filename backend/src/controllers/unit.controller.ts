import { Request, Response } from 'express';
import { db } from '../config/database';
import { success, fail } from '../utils/response';
import {
  getCategories,
  convertUnit,
  convertAll,
  isPremiumCategory,
} from '../services/unit.service';

// List all categories
export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = getCategories();
  return success(res, categories);
}

// Single unit conversion
export async function convertOne(req: Request, res: Response): Promise<void> {
  const { value, fromUnit, toUnit, category } = req.body;

  if (value == null || !fromUnit || !toUnit || !category) {
    return fail(res, '请提供完整的换算参数');
  }

  // Check premium access — VIP only, no token fallback
  if (isPremiumCategory(category)) {
    if (!req.userId) {
      return fail(res, '高级单位换算需要登录并开通 VIP');
    }
    const user = await db('users').where({ id: req.userId }).first();
    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();
    if (!vip && (user?.total_recharge || 0) < 500) {
      return fail(res, '高级单位换算需要开通 VIP，请前往 VIP 中心升级');
    }
  }

  try {
    const result = convertUnit(value, fromUnit, toUnit, category);
    return success(res, result);
  } catch (err: any) {
    return fail(res, err.message || '单位换算失败');
  }
}

// Convert to all units in a category
export async function convertToAll(req: Request, res: Response): Promise<void> {
  const { value, fromUnit, category } = req.body;

  if (value == null || !fromUnit || !category) {
    return fail(res, '请提供完整的换算参数');
  }

  // Premium check — same as convertOne
  if (isPremiumCategory(category)) {
    if (!req.userId) {
      return fail(res, '高级单位换算需要登录并开通 VIP');
    }
    const user = await db('users').where({ id: req.userId }).first();
    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();
    if (!vip && (user?.total_recharge || 0) < 500) {
      return fail(res, '高级单位换算需要开通 VIP，请前往 VIP 中心升级');
    }
  }

  try {
    const results = convertAll(value, fromUnit, category);
    return success(res, { value, fromUnit, category, results });
  } catch (err: any) {
    return fail(res, err.message || '单位换算失败');
  }
}
