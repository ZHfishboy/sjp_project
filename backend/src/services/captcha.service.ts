import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import redis from '../config/redis';
import { config } from '../config';

// ── Types ──

export type CaptchaType = 'image' | 'arithmetic' | 'slider' | 'click';

export interface CaptchaResult {
  captchaId: string;
  type: CaptchaType;
  data: any; // type-specific payload
}

export interface CaptchaVerifyParams {
  captchaId: string;
  answer: string; // general-purpose answer field
  sliderX?: number; // slider-specific
  clickPoints?: { x: number; y: number }[]; // click-specific
}

// ── Redis Keys ──

const CAPTCHA_PREFIX = 'captcha:';

// ── Helpers ──

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor(min = 0, max = 160): string {
  const r = randomInt(min, max);
  const g = randomInt(min, max);
  const b = randomInt(min, max);
  return `rgb(${r},${g},${b})`;
}

// ====================================================================
// 1. Traditional Graphic Captcha (SVG)
// ====================================================================

function generateImageCaptcha(): { answer: string; svg: string } {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const length = 4;
  let answer = '';
  for (let i = 0; i < length; i++) {
    answer += randomChar(chars);
  }

  const width = 120;
  const height = 44;
  const charWidth = width / (length + 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#f0f2f5" rx="4"/>`;

  // Noise dots
  for (let i = 0; i < 30; i++) {
    const cx = randomInt(0, width);
    const cy = randomInt(0, height);
    const r = randomInt(1, 2);
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${randomColor(100, 200)}"/>`;
  }

  // Noise lines (3)
  for (let i = 0; i < 3; i++) {
    const x1 = randomInt(0, width / 2);
    const y1 = randomInt(0, height);
    const x2 = randomInt(width / 2, width);
    const y2 = randomInt(0, height);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${randomColor(100, 180)}" stroke-width="1"/>`;
  }

  // Characters with rotation and offset
  for (let i = 0; i < length; i++) {
    const x = charWidth * (i + 0.7);
    const y = height / 2 + randomInt(-6, 6);
    const rotation = randomInt(-30, 30);
    const fontSize = randomInt(22, 28);
    const fill = randomColor(20, 100);

    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial,Helvetica" font-weight="bold" fill="${fill}" transform="rotate(${rotation}, ${x}, ${y})" text-anchor="middle" dominant-baseline="central">${answer[i]}</text>`;
  }

  svg += `</svg>`;
  return { answer: answer.toLowerCase(), svg };
}

// ====================================================================
// 2. Arithmetic Captcha
// ====================================================================

function generateArithmeticCaptcha(): { answer: string; expression: string } {
  const a = randomInt(1, 20);
  const b = randomInt(1, 20);
  const op = ['+', '-', '×'][randomInt(0, 2)];

  let result: number;
  let opDisplay: string;
  switch (op) {
    case '+':
      result = a + b;
      opDisplay = '+';
      break;
    case '-':
      result = Math.max(a, b) - Math.min(a, b);
      opDisplay = '-';
      break;
    case '×':
      result = a * b;
      opDisplay = '×';
      break;
    default:
      result = a + b;
      opDisplay = '+';
  }

  const expression = `${Math.max(a, b)} ${opDisplay} ${Math.min(a, b)} = ?`;
  return { answer: String(result), expression };
}

// ====================================================================
// 3. Slider Captcha
// ====================================================================

function generateSliderCaptcha(): { answer: string; sliderY: number; expectedX: number } {
  // Expected slider position (percent 20-80, mapped to 0-100 integer)
  const expectedX = randomInt(25, 75);
  // We'll generate a simple SVG background for the slider puzzle
  return {
    answer: String(expectedX),
    sliderY: 0,
    expectedX,
  };
}

// ====================================================================
// 4. Click-to-Select Captcha
// ====================================================================

function generateClickCaptcha(): { answer: string; chars: string; prompt: string } {
  const chars = '日月山水火土金木';
  const pick = randomInt(0, chars.length - 3);
  const selected = chars.slice(pick, pick + 3);
  const shuffled = selected
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return {
    answer: selected, // expected order
    chars: shuffled, // shuffled display
    prompt: `请按顺序点击：${selected.split('').join(' → ')}`,
  };
}

// ====================================================================
// Public API
// ====================================================================

export async function generateCaptcha(type: CaptchaType = 'image'): Promise<CaptchaResult> {
  const captchaId = uuidv4();
  const key = CAPTCHA_PREFIX + captchaId;
  let answer: string;
  let data: any;

  switch (type) {
    case 'image': {
      const result = generateImageCaptcha();
      answer = result.answer;
      data = { svg: result.svg };
      break;
    }
    case 'arithmetic': {
      const result = generateArithmeticCaptcha();
      answer = result.answer;
      data = { expression: result.expression };
      break;
    }
    case 'slider': {
      const result = generateSliderCaptcha();
      answer = result.answer;
      data = { expectedX: result.expectedX };
      break;
    }
    case 'click': {
      const result = generateClickCaptcha();
      answer = result.answer;
      data = { chars: result.chars, prompt: result.prompt };
      break;
    }
    default:
      throw new Error(`Unknown captcha type: ${type}`);
  }

  // Store in Redis
  await redis.set(key, answer, config.captcha.expireSeconds);

  return { captchaId, type, data };
}

export async function verifyCaptcha(params: CaptchaVerifyParams): Promise<boolean> {
  const key = CAPTCHA_PREFIX + params.captchaId;
  const stored = await redis.get(key);

  if (!stored) {
    return false; // expired or never existed
  }

  let isValid = false;

  if (params.sliderX !== undefined) {
    // Slider: allow ±5px tolerance
    const expected = parseInt(stored, 10);
    isValid = Math.abs(params.sliderX - expected) <= 5;
  } else if (params.clickPoints && params.clickPoints.length > 0) {
    // Click captcha: compare answer strings (already in order from client)
    const userOrder = params.answer || '';
    isValid = userOrder === stored;
  } else {
    // Image / arithmetic: direct string comparison (case-insensitive)
    isValid = (params.answer || '').toLowerCase() === stored.toLowerCase();
  }

  // One-time use: delete after verification
  if (isValid) {
    await redis.del(key);
  }

  return isValid;
}

export async function deleteCaptcha(captchaId: string): Promise<void> {
  await redis.del(CAPTCHA_PREFIX + captchaId);
}

// ====================================================================
// Verification Code (SMS / Email) — 6-digit numeric
// ====================================================================

export async function generateVerificationCode(
  target: string,
  type: 'sms' | 'email',
): Promise<{ code: string; expireSeconds: number }> {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[randomInt(0, 9)];
  }

  const key = `verify:${type}:${target}`;
  const expireSeconds = 300; // 5 minutes
  await redis.set(key, code, expireSeconds);

  return { code, expireSeconds };
}

export async function verifyCode(
  target: string,
  type: 'sms' | 'email',
  code: string,
): Promise<boolean> {
  const key = `verify:${type}:${target}`;
  const stored = await redis.get(key);

  if (!stored) return false;

  const isValid = stored === code;
  if (isValid) {
    await redis.del(key);
  }
  return isValid;
}

// Rate limiting for verification codes
export async function canSendCode(target: string, type: 'sms' | 'email'): Promise<{
  allowed: boolean;
  retryAfter: number;
}> {
  const rateKey = `verify:rate:${type}:${target}`;
  const count = await redis.get(rateKey);

  if (count && parseInt(count, 10) >= 5) {
    const ttl = await redis.ttl(rateKey);
    return { allowed: false, retryAfter: ttl > 0 ? ttl : 60 };
  }

  await redis.incr(rateKey);
  await redis.expire(rateKey, 3600); // 1 hour window for rate limiting

  return { allowed: true, retryAfter: 0 };
}
