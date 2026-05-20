import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const defaultDbPath = isVercel
  ? path.join('/tmp', 'calcmaster.db')
  : path.join(__dirname, '..', '..', 'data', 'calcmaster.db');

export const config = {
  env: process.env.NODE_ENV || 'development',
  isVercel,
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  db: {
    path: process.env.DB_PATH || defaultDbPath,
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  captcha: {
    expireSeconds: parseInt(process.env.CAPTCHA_EXPIRE_SECONDS || '120', 10),
    maxPerIpPerMinute: parseInt(process.env.CAPTCHA_MAX_PER_IP_PER_MINUTE || '10', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  speedTier: {
    tier3DelayMs: parseInt(process.env.SPEED_TIER_3_DELAY_MS || '3000', 10),
    tier2DelayMs: parseInt(process.env.SPEED_TIER_2_DELAY_MS || '200', 10),
    tier1DelayMs: parseInt(process.env.SPEED_TIER_1_DELAY_MS || '0', 10),
  },
};
