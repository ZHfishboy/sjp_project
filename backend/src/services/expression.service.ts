import { create, all, MathJsInstance } from 'mathjs';
import { config } from '../config';

// ── Custom Math.js instance ──
const math: MathJsInstance = create(all, {
  number: 'number', // Use JS numbers (faster than BigNumber for our use case)
  precision: 15,
});

// ── Token cost definitions (per PRD 3.8) ──

export interface TokenCostResult {
  tokens: number;
  operations: string[];
}

const FREE_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'log', 'ln', 'log2', 'log10',
  'sqrt', 'abs', 'round', 'floor', 'ceil',
  'exp', 'pow',
  '+', '-', '*', '/', '%', '^',
  '(', ')',
]);

const TOKEN_1_FUNCTIONS = new Set([
  'sinh', 'cosh', 'tanh',
  'permutations', 'combination',
  'bin', 'oct', 'dec', 'hex',
]);

const TOKEN_2_FUNCTIONS = new Set([
  'polynomialRoot',
]);

const TOKEN_3_FUNCTIONS = new Set([
  'det', 'inv', 'transpose', 'matrix',
]);

// ====================================================================
// Speed Tier Delay
// ====================================================================
function getSpeedDelay(rechargeTotal: number): number {
  if (rechargeTotal >= 200) return config.speedTier.tier1DelayMs; // ⚡ Lightning
  if (rechargeTotal >= 50) return config.speedTier.tier2DelayMs;  // 🚗 Normal
  return config.speedTier.tier3DelayMs;                            // 🐢 Turtle
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ====================================================================
// Free Tier Limit — only 2-digit + - * / for non-VIP users
// ====================================================================
export function checkFreeLimit(expr: string): { allowed: boolean; reason: string } {
  const trimmed = expr.trim();

  // Only allow: digits, spaces, +, -, *, /
  if (!/^[\d\s+\-*/]+$/.test(trimmed)) {
    // Check what kind of restricted content is present
    if (/[a-zA-Z]/.test(trimmed)) return { allowed: false, reason: '普通用户仅支持加减乘除，函数运算请开通 VIP' };
    if (/[.()^%√π!]/.test(trimmed)) return { allowed: false, reason: '普通用户仅支持整数四则运算，高级运算请开通 VIP' };
    return { allowed: false, reason: '普通用户仅支持两位数的加减乘除，请开通 VIP 解锁全部功能' };
  }

  // Extract all numbers and check each is at most 2 digits
  const numbers = trimmed.split(/[+\-*/]+/).filter(Boolean);
  for (const num of numbers) {
    const val = parseInt(num, 10);
    if (isNaN(val) || val < 0 || val > 99) {
      return { allowed: false, reason: `普通用户仅支持两位数以内（0-99），"${num}" 超出范围，请开通 VIP` };
    }
  }

  // Prevent division by zero at validation level
  if (/\/\s*0(?!\d)/.test(trimmed)) {
    return { allowed: false, reason: '除数不能为零' };
  }

  return { allowed: true, reason: '' };
}
// ====================================================================
export function analyzeExpression(expr: string): TokenCostResult {
  const operations: string[] = [];
  let tokens = 0;

  // Detect advanced math functions
  const advancedPatterns: [RegExp, string, number][] = [
    [/\bsinh\b/, 'sinh', 1],
    [/\bcosh\b/, 'cosh', 1],
    [/\btanh\b/, 'tanh', 1],
    [/\bpermutations\b/, 'permutations', 1],
    [/\bcombination\b/, 'combination', 1],
    [/\bdet\b/, 'det', 3],
    [/\binv\b/, 'inv', 3],
    [/\btranspose\b/, 'transpose', 3],
    [/\bmatrix\b/, 'matrix', 3],
    [/\bpolynomialRoot\b/, 'polynomialRoot', 2],
    [/\bregression\b/, 'regression', 3],
  ];

  for (const [pattern, name, cost] of advancedPatterns) {
    if (pattern.test(expr)) {
      operations.push(name);
      tokens += cost;
    }
  }

  // Deduplicate token cost (same function counted once)
  return { tokens: Math.min(tokens, 10), operations };
}

// ====================================================================
// Main Evaluate
// ====================================================================
export interface CalcResult {
  expression: string;
  result: string;
  type: number; // 1=basic, 2=scientific
  tokensSpent: number;
  responseTimeMs: number;
  operations: string[];
}

export async function evaluate(
  expression: string,
  options: {
    angleMode?: 'deg' | 'rad' | 'grad';
    rechargeTotal?: number;
    isVip?: boolean;
    precision?: number;
  } = {},
): Promise<CalcResult> {
  const { angleMode = 'deg', rechargeTotal = 0, isVip = false, precision = 4 } = options;
  const startTime = Date.now();

  // Apply speed tier delay (VIP with time subscription = no delay)
  if (!isVip) {
    const delay = getSpeedDelay(rechargeTotal);
    if (delay > 0) {
      await sleep(delay);
    }
  }

  // Free tier restriction: non-VIP users only get 2-digit + - * /
  if (!isVip && rechargeTotal < 500) {
    const limitCheck = checkFreeLimit(expression);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason);
    }
  }

  // Token analysis for non-VIP users
  let tokenCost = 0;
  let operations: string[] = [];
  if (!isVip && rechargeTotal < 500) {
    const analysis = analyzeExpression(expression);
    tokenCost = analysis.tokens;
    operations = analysis.operations;
  }

  // Pre-process expression
  let processed = expression.trim();

  // Remove trailing = sign
  if (processed.endsWith('=')) {
    processed = processed.slice(0, -1).trim();
  }

  // Replace common symbols
  processed = processed
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/PI/g, 'pi')
    .replace(/e(?![xp])/g, '(e)')  // careful with 'e' constant vs 'exp'
    .replace(/√\(/g, 'sqrt(')
    .replace(/√/g, 'sqrt(');

  // Handle implicit multiplication: 2pi, 3(4+5), (2)(3)
  processed = processed
    .replace(/(\d)(pi\b)/g, '$1*pi')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)\(/g, ')*(')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/(\d)([a-zA-Z])/g, '$1*$2');

  // Fix: restored 'e' replacement
  processed = processed.replace(/\(e\)/g, 'e');

  // Handle percentage: "200*5%" -> "200*5/100"
  processed = processed.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

  // Auto-close unmatched parentheses
  let openCount = 0;
  for (const ch of processed) {
    if (ch === '(') openCount++;
    if (ch === ')') openCount--;
  }
  for (let i = 0; i < openCount; i++) {
    processed += ')';
  }

  // Note: angle mode conversion is handled in the evaluate step below

  try {
    // Evaluate with mathjs
    let result: any;

    if (angleMode === 'deg') {
      // For degree mode, convert trig inputs from deg to rad
      const degAdjusted = processed.replace(
        /(sin|cos|tan)(\s*)\(([^)]+)\)/g,
        (match, fn, sp, inner) => {
          return `${fn}${sp}((${inner}) * pi / 180)`;
        },
      );
      // arc functions: convert result from rad to deg
      result = math.evaluate(degAdjusted);
      // Post-process: if expression has arc trig, convert result to degrees
      if (/\b(asin|acos|atan)\b/.test(processed)) {
        if (typeof result === 'number') {
          // mathjs arc functions return radians, convert to degrees
          // We need to detect if the outermost function is an arc function
          const trimmed = processed.trim();
          const arcMatch = trimmed.match(/^(asin|acos|atan)\s*\(/);
          if (arcMatch) {
            result = (result * 180) / Math.PI;
          }
        }
      }
    } else {
      result = math.evaluate(processed);
    }

    // Format result
    let resultStr: string;
    if (typeof result === 'number') {
      if (Number.isNaN(result)) {
        throw new Error('计算结果为 NaN');
      }
      if (!Number.isFinite(result)) {
        throw new Error('计算结果为无穷大（可能除以了零）');
      }
      resultStr = Number(result.toPrecision(precision + 2)).toString();
    } else if (result && typeof result === 'object') {
      // Matrix or complex result
      resultStr = result.toString();
    } else {
      resultStr = String(result);
    }

    const responseTimeMs = Date.now() - startTime;

    // Determine calculation type
    const type = operations.length > 0 ? 2 : 1; // 1=basic, 2=scientific

    return {
      expression: processed,
      result: resultStr,
      type,
      tokensSpent: tokenCost,
      responseTimeMs,
      operations,
    };
  } catch (err: any) {
    // Try to provide helpful error messages
    let message = err.message || '表达式解析错误';

    if (message.includes('Undefined symbol')) {
      const match = message.match(/Undefined symbol\s+(\w+)/);
      if (match) {
        message = `未识别的符号: "${match[1]}"`;
      }
    } else if (message.includes('Unexpected type')) {
      message = '表达式类型错误';
    } else if (message.includes('Unexpected end')) {
      message = '表达式不完整';
    }

    throw new Error(message);
  }
}

// ====================================================================
// Matrix Operations
// ====================================================================
export function matrixOperation(
  operation: 'add' | 'subtract' | 'multiply' | 'transpose' | 'determinant' | 'inverse',
  matrixA: number[][],
  matrixB?: number[][],
): string {
  try {
    const a = math.matrix(matrixA);
    let result: any;

    switch (operation) {
      case 'add':
        if (!matrixB) throw new Error('需要第二个矩阵');
        result = math.add(a, math.matrix(matrixB));
        break;
      case 'subtract':
        if (!matrixB) throw new Error('需要第二个矩阵');
        result = math.subtract(a, math.matrix(matrixB));
        break;
      case 'multiply':
        if (!matrixB) throw new Error('需要第二个矩阵');
        result = math.multiply(a, math.matrix(matrixB));
        break;
      case 'transpose':
        result = math.transpose(a);
        break;
      case 'determinant':
        result = math.det(a);
        break;
      case 'inverse':
        result = math.inv(a);
        break;
      default:
        throw new Error(`未知矩阵运算: ${operation}`);
    }

    return result.toString();
  } catch (err: any) {
    throw new Error(`矩阵运算错误: ${err.message}`);
  }
}

// ====================================================================
// Equation Solvers
// ====================================================================

// Quadratic equation: ax² + bx + c = 0
export function solveQuadratic(a: number, b: number, c: number): {
  roots: string[];
  discriminant: number;
} {
  const discriminant = b * b - 4 * a * c;

  if (a === 0) {
    // Linear equation
    if (b === 0) {
      return { roots: c === 0 ? ['无穷解'] : ['无解'], discriminant: 0 };
    }
    return { roots: [(-c / b).toString()], discriminant: 0 };
  }

  if (discriminant > 0) {
    const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    return { roots: [root1.toString(), root2.toString()], discriminant };
  } else if (discriminant === 0) {
    const root = -b / (2 * a);
    return { roots: [root.toString()], discriminant };
  } else {
    const realPart = (-b / (2 * a)).toString();
    const imagPart = (Math.sqrt(-discriminant) / (2 * a)).toString();
    return {
      roots: [`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`],
      discriminant,
    };
  }
}

// Linear system: 2x + y = 5, x - y = 1  (Cramer's rule)
export function solveLinearSystem2(
  a1: number, b1: number, c1: number, // a1*x + b1*y = c1
  a2: number, b2: number, c2: number, // a2*x + b2*y = c2
): { x: number; y: number } | null {
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-10) {
    return null; // No unique solution
  }
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return { x, y };
}

// ====================================================================
// Number Base Conversion
// ====================================================================
export function convertBase(value: string, fromBase: number, toBase: number): string {
  const bases: Record<number, number> = { 2: 2, 8: 8, 10: 10, 16: 16 };
  const from = bases[fromBase];
  const to = bases[toBase];

  if (!from || !to) {
    throw new Error('进制转换仅支持 2/8/10/16 进制');
  }

  const decimal = parseInt(value, from);
  if (isNaN(decimal)) {
    throw new Error(`"${value}" 不是有效的 ${fromBase} 进制数`);
  }

  return decimal.toString(to).toUpperCase();
}

// ====================================================================
// Statistics
// ====================================================================
export function statistics(data: number[]): {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
} {
  if (data.length === 0) {
    throw new Error('数据集为空');
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Median
  let median: number;
  if (n % 2 === 0) {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  } else {
    median = sorted[Math.floor(n / 2)];
  }

  // Mode
  const freq: Record<number, number> = {};
  let maxFreq = 0;
  for (const v of data) {
    freq[v] = (freq[v] || 0) + 1;
    maxFreq = Math.max(maxFreq, freq[v]);
  }
  const mode = Object.entries(freq)
    .filter(([, f]) => f === maxFreq)
    .map(([v]) => Number(v));

  // Variance & StdDev (sample)
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    sum,
    mean,
    median,
    mode,
    variance,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
  };
}

// ====================================================================
// Linear Regression: y = mx + b
// ====================================================================
export function linearRegression(points: [number, number][]): {
  slope: number;
  intercept: number;
  r2: number;
  equation: string;
} {
  const n = points.length;
  if (n < 2) throw new Error('至少需要 2 个数据点');

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssRes = points.reduce((s, [x, y]) => s + (y - (slope * x + intercept)) ** 2, 0);
  const ssTot = points.reduce((s, [, y]) => s + (y - yMean) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    r2,
    equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
  };
}
