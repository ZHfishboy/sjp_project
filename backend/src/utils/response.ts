import { Response } from 'express';

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: number;
}

export interface PaginatedData<T = any> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function success<T>(res: Response, data: T, message = 'ok', statusCode = 200): void {
  const body: ApiResponse<T> = {
    code: statusCode,
    message,
    data,
    timestamp: Date.now(),
  };
  res.status(statusCode).json(body);
}

export function paginated<T>(
  res: Response,
  list: T[],
  total: number,
  page: number,
  pageSize: number,
  message = 'ok',
): void {
  const body: ApiResponse<PaginatedData<T>> = {
    code: 200,
    message,
    data: {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    timestamp: Date.now(),
  };
  res.status(200).json(body);
}

export function fail(res: Response, message: string, statusCode = 400, data: any = null): void {
  const body: ApiResponse = {
    code: statusCode,
    message,
    data,
    timestamp: Date.now(),
  };
  res.status(statusCode).json(body);
}

export function unauthorized(res: Response, message = '请先登录'): void {
  fail(res, message, 401);
}

export function forbidden(res: Response, message = '权限不足'): void {
  fail(res, message, 403);
}

export function notFound(res: Response, message = '资源不存在'): void {
  fail(res, message, 404);
}

export function tooManyRequests(res: Response, message = '请求过于频繁，请稍后再试'): void {
  fail(res, message, 429);
}

export function serverError(res: Response, message = '服务器内部错误'): void {
  fail(res, message, 500);
}
