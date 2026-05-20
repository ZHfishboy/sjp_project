import { Request, Response, NextFunction } from 'express';
import { serverError, fail } from '../utils/response';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 400, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    return fail(res, err.message, err.statusCode);
  }

  // SQLite unique constraint violation
  if ((err as any).message?.includes('UNIQUE constraint failed')) {
    return fail(res, '数据已存在，请勿重复操作', 409);
  }

  // SQLite foreign key violation
  if ((err as any).message?.includes('FOREIGN KEY constraint failed')) {
    return fail(res, '关联数据不存在', 400);
  }

  // Unexpected error
  serverError(res, process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误');
}

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, '请求的资源不存在', 404);
}
