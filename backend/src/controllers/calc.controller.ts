import { Request, Response } from 'express';
import { db } from '../config/database';
import { success, fail, paginated } from '../utils/response';
import {
  evaluate,
  analyzeExpression,
  matrixOperation,
  solveQuadratic,
  solveLinearSystem2,
  convertBase,
  statistics,
  linearRegression,
} from '../services/expression.service';

// ====================================================================
// Expression Evaluate
// ====================================================================
export async function evaluateExpression(req: Request, res: Response): Promise<void> {
  const { expression, angleMode = 'deg', precision } = req.body;

  if (!expression || typeof expression !== 'string') {
    return fail(res, '请输入计算表达式');
  }

  if (expression.length > 500) {
    return fail(res, '表达式过长（最多 500 个字符）');
  }

  // Determine user's recharge total and VIP status
  let rechargeTotal = 0;
  let isVip = false;

  if (req.userId) {
    const user = await db('users').where({ id: req.userId }).first();
    rechargeTotal = user?.total_recharge || 0;

    const vip = await db('user_vip')
      .where({ user_id: req.userId, status: 1 })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>', new Date());
      })
      .first();
    isVip = !!vip;
  }

  try {
    const result = await evaluate(expression, {
      angleMode: angleMode as 'deg' | 'rad',
      rechargeTotal,
      isVip,
      precision: precision || 4,
    });

    // Save to history if logged in
    if (req.userId) {
      await db('calculation_history').insert({
        user_id: req.userId,
        expression: result.expression,
        result: result.result,
        type: result.type,
        tokens_spent: result.tokensSpent,
        response_time_ms: result.responseTimeMs,
      });

      // Deduct tokens if applicable
      if (result.tokensSpent > 0) {
        const wallet = await db('user_wallet').where({ user_id: req.userId }).first();
        if (wallet) {
          const newBalance = Math.max(0, wallet.token_balance - result.tokensSpent);
          await db('user_wallet').where({ user_id: req.userId }).update({
            token_balance: newBalance,
            total_tokens_consumed: wallet.total_tokens_consumed + result.tokensSpent,
          });

          await db('token_consumption_log').insert({
            user_id: req.userId,
            operation_type: result.operations.join(',') || 'expression',
            operation_desc: expression.substring(0, 200),
            tokens_spent: result.tokensSpent,
            balance_before: wallet.token_balance,
            balance_after: newBalance,
            source: isVip ? 3 : 1,
            ip_address: req.ip,
          });
        }
      }
    }

    return success(res, {
      expression: result.expression,
      result: result.result,
      type: result.type,
      tokensSpent: result.tokensSpent,
      responseTimeMs: result.responseTimeMs,
      operations: result.operations,
    });
  } catch (err: any) {
    return fail(res, err.message || '计算错误');
  }
}

// ====================================================================
// Analyze (pre-check token cost)
// ====================================================================
export async function analyze(req: Request, res: Response): Promise<void> {
  const { expression } = req.body;
  if (!expression) return fail(res, '请输入表达式');

  const cost = analyzeExpression(expression);
  return success(res, cost);
}

// ====================================================================
// Matrix Operations (discrete)
// ====================================================================
export async function matrixCalc(req: Request, res: Response): Promise<void> {
  const { operation, matrixA, matrixB } = req.body;

  if (!operation || !matrixA) {
    return fail(res, '请提供矩阵数据和运算类型');
  }

  try {
    const result = matrixOperation(operation, matrixA, matrixB);
    return success(res, { result, operation });
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Equation Solvers
// ====================================================================
export async function solveEquation(req: Request, res: Response): Promise<void> {
  const { type, coefficients } = req.body;

  try {
    if (type === 'quadratic') {
      const [a, b, c] = coefficients;
      const result = solveQuadratic(a, b, c);
      return success(res, result);
    }

    if (type === 'linear2') {
      const [a1, b1, c1, a2, b2, c2] = coefficients;
      const result = solveLinearSystem2(a1, b1, c1, a2, b2, c2);
      if (!result) {
        return fail(res, '方程组无唯一解（系数矩阵奇异）');
      }
      return success(res, result);
    }

    return fail(res, `不支持的方程类型: ${type}`);
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Base Conversion
// ====================================================================
export async function baseConversion(req: Request, res: Response): Promise<void> {
  const { value, fromBase, toBase } = req.body;

  if (!value || fromBase == null || toBase == null) {
    return fail(res, '请提供完整的进制转换参数');
  }

  try {
    const result = convertBase(String(value), fromBase, toBase);
    return success(res, { value, fromBase, toBase, result });
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Statistics
// ====================================================================
export async function calcStatistics(req: Request, res: Response): Promise<void> {
  const { data } = req.body;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return fail(res, '请提供有效的数据集');
  }

  if (data.length > 10000) {
    return fail(res, '数据量过大（最多 10000 个）');
  }

  try {
    const result = statistics(data.map(Number));
    return success(res, result);
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// Regression
// ====================================================================
export async function calcRegression(req: Request, res: Response): Promise<void> {
  const { points } = req.body;

  if (!points || !Array.isArray(points) || points.length < 2) {
    return fail(res, '至少需要 2 个数据点');
  }

  try {
    const result = linearRegression(points as [number, number][]);
    return success(res, result);
  } catch (err: any) {
    return fail(res, err.message);
  }
}

// ====================================================================
// History
// ====================================================================
export async function getHistory(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
  const type = req.query.type ? parseInt(req.query.type as string) : undefined;

  let query = db('calculation_history')
    .where({ user_id: userId, is_deleted: 0 })
    .orderBy('created_at', 'desc');

  if (type) {
    query = query.where({ type });
  }

  const totalQuery = query.clone().count('* as total').first();
  const dataQuery = query
    .select('id', 'expression', 'result', 'type', 'tokens_spent', 'response_time_ms', 'created_at')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const [totalResult, list] = await Promise.all([totalQuery, dataQuery]);
  const total = (totalResult as any)?.total || 0;

  return paginated(res, list, total, page, pageSize);
}

export async function deleteHistory(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { id } = req.params;

  await db('calculation_history')
    .where({ id: parseInt(id), user_id: userId })
    .update({ is_deleted: 1 });

  return success(res, null, '已删除');
}

export async function clearHistory(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  await db('calculation_history')
    .where({ user_id: userId })
    .update({ is_deleted: 1 });

  return success(res, null, '历史记录已清空');
}

// ====================================================================
// Favorites
// ====================================================================
export async function addFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { expression, result, note } = req.body;

  if (!expression || !result) {
    return fail(res, '请提供表达式和结果');
  }

  // Check favorite limit for non-VIP
  const count = await db('favorites').where({ user_id: userId }).count('* as total').first();
  const total = (count as any)?.total || 0;

  const vip = await db('user_vip')
    .where({ user_id: userId, status: 1 })
    .where(function () {
      this.whereNull('end_date').orWhere('end_date', '>', new Date());
    })
    .first();

  const user = await db('users').where({ id: userId }).first();
  const maxFavorites = vip ? Infinity : (user?.total_recharge || 0) >= 500 ? 50 : 10;

  if (total >= maxFavorites) {
    return fail(res, `收藏夹已满（上限 ${maxFavorites} 条），请升级 VIP 获取无限收藏`);
  }

  await db('favorites').insert({
    user_id: userId,
    expression,
    result,
    note: note || '',
  });

  return success(res, null, '已收藏');
}

export async function getFavorites(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

  const totalQuery = db('favorites').where({ user_id: userId }).count('* as total').first();
  const dataQuery = db('favorites')
    .where({ user_id: userId })
    .select('id', 'expression', 'result', 'note', 'created_at')
    .orderBy('created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const [totalResult, list] = await Promise.all([totalQuery, dataQuery]);
  const total = (totalResult as any)?.total || 0;

  return paginated(res, list, total, page, pageSize);
}

export async function deleteFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { id } = req.params;

  await db('favorites').where({ id: parseInt(id), user_id: userId }).del();

  return success(res, null, '已取消收藏');
}
