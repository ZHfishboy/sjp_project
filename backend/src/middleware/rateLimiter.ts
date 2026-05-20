import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General API rate limiter — applies to all /api/ routes.
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
    data: null,
    timestamp: Date.now(),
  },
});

/**
 * Strict limiter for auth endpoints (login, register, captcha).
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: '操作过于频繁，请稍后再试',
    data: null,
    timestamp: Date.now(),
  },
});

/**
 * Captcha-specific limiter — per IP.
 */
export const captchaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.captcha.maxPerIpPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: '验证码请求过于频繁，请稍后再试',
    data: null,
    timestamp: Date.now(),
  },
});

/**
 * Calculation limiter — prevents abuse of compute resources.
 */
export const calcLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: '计算请求过于频繁，请稍后再试',
    data: null,
    timestamp: Date.now(),
  },
});
