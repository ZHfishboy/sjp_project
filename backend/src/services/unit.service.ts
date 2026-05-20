import { create, all, Unit } from 'mathjs';

const math = create(all, { number: 'number' });

// ── Unit Categories & Definitions ──

export interface UnitDef {
  key: string;
  name: string;
  nameCN: string;
  baseUnit: string;
}

export const UNIT_CATEGORIES: Record<string, UnitDef[]> = {
  length: [
    { key: 'm', name: 'meter', nameCN: '米', baseUnit: 'm' },
    { key: 'km', name: 'kilometer', nameCN: '千米', baseUnit: 'km' },
    { key: 'cm', name: 'centimeter', nameCN: '厘米', baseUnit: 'cm' },
    { key: 'mm', name: 'millimeter', nameCN: '毫米', baseUnit: 'mm' },
    { key: 'mile', name: 'mile', nameCN: '英里', baseUnit: 'mile' },
    { key: 'yd', name: 'yard', nameCN: '码', baseUnit: 'yd' },
    { key: 'ft', name: 'foot', nameCN: '英尺', baseUnit: 'ft' },
    { key: 'inch', name: 'inch', nameCN: '英寸', baseUnit: 'inch' },
    { key: 'nmi', name: 'nautical mile', nameCN: '海里', baseUnit: 'nmi' },
  ],
  weight: [
    { key: 'kg', name: 'kilogram', nameCN: '千克', baseUnit: 'kg' },
    { key: 'g', name: 'gram', nameCN: '克', baseUnit: 'g' },
    { key: 'mg', name: 'milligram', nameCN: '毫克', baseUnit: 'mg' },
    { key: 't', name: 'tonne', nameCN: '吨', baseUnit: 't' },
    { key: 'lb', name: 'pound', nameCN: '磅', baseUnit: 'lb' },
    { key: 'oz', name: 'ounce', nameCN: '盎司', baseUnit: 'oz' },
    { key: 'ct', name: 'carat', nameCN: '克拉', baseUnit: 'ct' },
  ],
  temperature: [
    { key: 'degC', name: 'celsius', nameCN: '摄氏度', baseUnit: 'degC' },
    { key: 'degF', name: 'fahrenheit', nameCN: '华氏度', baseUnit: 'degF' },
    { key: 'K', name: 'kelvin', nameCN: '开尔文', baseUnit: 'K' },
  ],
  area: [
    { key: 'm2', name: 'sq meter', nameCN: '平方米', baseUnit: 'm^2' },
    { key: 'km2', name: 'sq kilometer', nameCN: '平方千米', baseUnit: 'km^2' },
    { key: 'ha', name: 'hectare', nameCN: '公顷', baseUnit: 'ha' },
    { key: 'acre', name: 'acre', nameCN: '英亩', baseUnit: 'acre' },
    { key: 'ft2', name: 'sq foot', nameCN: '平方英尺', baseUnit: 'ft^2' },
    { key: 'mu', name: 'mu', nameCN: '亩', baseUnit: 'mu' },
  ],
  volume: [
    { key: 'L', name: 'liter', nameCN: '升', baseUnit: 'L' },
    { key: 'mL', name: 'milliliter', nameCN: '毫升', baseUnit: 'mL' },
    { key: 'm3', name: 'cubic meter', nameCN: '立方米', baseUnit: 'm^3' },
    { key: 'galUS', name: 'gallon(US)', nameCN: '美制加仑', baseUnit: 'galUS' },
    { key: 'galUK', name: 'gallon(UK)', nameCN: '英制加仑', baseUnit: 'galUK' },
    { key: 'qt', name: 'quart', nameCN: '夸脱', baseUnit: 'qt' },
    { key: 'pt', name: 'pint', nameCN: '品脱', baseUnit: 'pt' },
    { key: 'cup', name: 'cup', nameCN: '杯', baseUnit: 'cup' },
  ],
  speed: [
    { key: 'kmh', name: 'km/h', nameCN: '千米/时', baseUnit: 'km/h' },
    { key: 'ms', name: 'm/s', nameCN: '米/秒', baseUnit: 'm/s' },
    { key: 'mph', name: 'mph', nameCN: '英里/时', baseUnit: 'mph' },
    { key: 'knot', name: 'knot', nameCN: '节', baseUnit: 'knot' },
    { key: 'mach', name: 'mach', nameCN: '马赫', baseUnit: 'mach' },
  ],
  pressure: [
    { key: 'Pa', name: 'pascal', nameCN: '帕斯卡', baseUnit: 'Pa' },
    { key: 'kPa', name: 'kilopascal', nameCN: '千帕', baseUnit: 'kPa' },
    { key: 'atm', name: 'atmosphere', nameCN: '标准大气压', baseUnit: 'atm' },
    { key: 'bar', name: 'bar', nameCN: '巴', baseUnit: 'bar' },
    { key: 'psi', name: 'psi', nameCN: '磅/平方英寸', baseUnit: 'psi' },
    { key: 'mmHg', name: 'mmHg', nameCN: '毫米汞柱', baseUnit: 'mmHg' },
  ],
  power: [
    { key: 'W', name: 'watt', nameCN: '瓦特', baseUnit: 'W' },
    { key: 'kW', name: 'kilowatt', nameCN: '千瓦', baseUnit: 'kW' },
    { key: 'hp', name: 'horsepower', nameCN: '马力', baseUnit: 'hp' },
    { key: 'BTUh', name: 'BTU/h', nameCN: '英热单位/时', baseUnit: 'BTU/h' },
  ],
  data: [
    { key: 'bit', name: 'bit', nameCN: '比特', baseUnit: 'bit' },
    { key: 'B', name: 'byte', nameCN: '字节', baseUnit: 'B' },
    { key: 'KB', name: 'kilobyte', nameCN: '千字节', baseUnit: 'KB' },
    { key: 'MB', name: 'megabyte', nameCN: '兆字节', baseUnit: 'MB' },
    { key: 'GB', name: 'gigabyte', nameCN: '吉字节', baseUnit: 'GB' },
    { key: 'TB', name: 'terabyte', nameCN: '太字节', baseUnit: 'TB' },
    { key: 'PB', name: 'petabyte', nameCN: '拍字节', baseUnit: 'PB' },
  ],
  angle: [
    { key: 'deg', name: 'degree', nameCN: '度', baseUnit: 'deg' },
    { key: 'rad', name: 'radian', nameCN: '弧度', baseUnit: 'rad' },
    { key: 'grad', name: 'gradian', nameCN: '百分度', baseUnit: 'grad' },
  ],
  time: [
    { key: 's', name: 'second', nameCN: '秒', baseUnit: 's' },
    { key: 'min', name: 'minute', nameCN: '分钟', baseUnit: 'min' },
    { key: 'h', name: 'hour', nameCN: '小时', baseUnit: 'h' },
    { key: 'day', name: 'day', nameCN: '天', baseUnit: 'day' },
    { key: 'week', name: 'week', nameCN: '周', baseUnit: 'week' },
    { key: 'month', name: 'month', nameCN: '月(30天)', baseUnit: 'month' },
    { key: 'year', name: 'year', nameCN: '年(365天)', baseUnit: 'year' },
  ],
  fuel: [
    { key: 'kmL', name: 'km/L', nameCN: '千米/升', baseUnit: 'km/L' },
    { key: 'L100km', name: 'L/100km', nameCN: '升/100千米', baseUnit: 'L/100km' },
    { key: 'mpgUS', name: 'mpg(US)', nameCN: '英里/加仑(美)', baseUnit: 'mpgUS' },
    { key: 'mpgUK', name: 'mpg(UK)', nameCN: '英里/加仑(英)', baseUnit: 'mpgUK' },
  ],
};

// Free categories (basic 8)
const FREE_CATEGORIES = new Set([
  'length', 'weight', 'temperature', 'area', 'volume', 'speed', 'data', 'angle', 'time',
]);

// ── Custom unit definitions for mathjs ──

// Define custom units not built into mathjs
const CUSTOM_UNITS: Record<string, { definition: string; offset?: number } | string> = {
  mu: { definition: '666.6666667 m^2' },
  galUS: { definition: '3.785411784 L' },
  galUK: { definition: '4.54609 L' },
  qt: { definition: '0.946352946 L' },
  pt: { definition: '0.473176473 L' },
  cup: { definition: '0.236588236 L' },
  ct: { definition: '0.2 g' },
  BTUh: { definition: '0.29307107 W' },
  ft2: { definition: '0.09290304 m^2' },
  km2: { definition: '1000000 m^2' },
  kmL: { definition: '1000 m/L' },
  L100km: 'custom_fuel', // handled via convertFuel()
  mpgUS: { definition: '0.4251437 km/L' },
  mpgUK: { definition: '0.354006 km/L' },
  nmi: { definition: '1852 m' },
  mach: { definition: '343 m/s' }, // at sea level
  mmHg: { definition: '133.322368 Pa' },
  month: { definition: '30 day' },
  year: { definition: '365 day' },
};

try {
  for (const [name, entry] of Object.entries(CUSTOM_UNITS)) {
    if (typeof entry === 'string') continue; // skip entries handled by custom functions
    math.createUnit(name, entry.definition);
  }
} catch {
  // Units may already be defined; ignore
}

// ── Data storage conversion (powers of 1024) ──
const DATA_FACTORS: Record<string, number> = {
  bit: 1,
  B: 8,
  KB: 8 * 1024,
  MB: 8 * 1024 * 1024,
  GB: 8 * 1024 * 1024 * 1024,
  TB: 8 * 1024 * 1024 * 1024 * 1024,
  PB: 8 * 1024 * 1024 * 1024 * 1024 * 1024,
};

function convertData(value: number, from: string, to: string): number {
  const fromFactor = DATA_FACTORS[from];
  const toFactor = DATA_FACTORS[to];
  if (!fromFactor || !toFactor) throw new Error(`不支持的数据单位: ${from}→${to}`);
  return (value * fromFactor) / toFactor;
}

// ── Temperature (mathjs handles this natively) ──

// ── Fuel Efficiency (special handling: inverse relationship) ──
function convertFuel(value: number, from: string, to: string): number {
  // Convert everything to km/L first, then to target
  let inKmL: number;

  switch (from) {
    case 'kmL': inKmL = value; break;
    case 'L100km': inKmL = value === 0 ? Infinity : 100 / value; break;
    case 'mpgUS': inKmL = value * 0.4251437; break;
    case 'mpgUK': inKmL = value * 0.354006; break;
    default: throw new Error(`不支持: ${from}`);
  }

  switch (to) {
    case 'kmL': return inKmL;
    case 'L100km': return inKmL === 0 ? Infinity : 100 / inKmL;
    case 'mpgUS': return inKmL / 0.4251437;
    case 'mpgUK': return inKmL / 0.354006;
    default: throw new Error(`不支持: ${to}`);
  }
}

// ====================================================================
// Public API
// ====================================================================

export interface ConvertResult {
  from: string;
  fromValue: number;
  to: string;
  toValue: number;
  category: string;
  formula: string;
}

export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: string,
): ConvertResult {
  try {
    let result: number;

    // Handle special categories
    if (category === 'data') {
      result = convertData(value, fromUnit, toUnit);
      return {
        from: fromUnit,
        fromValue: value,
        to: toUnit,
        toValue: result,
        category,
        formula: `${value} ${fromUnit} = ${result} ${toUnit}`,
      };
    }

    if (category === 'fuel') {
      result = convertFuel(value, fromUnit, toUnit);
      return {
        from: fromUnit,
        fromValue: value,
        to: toUnit,
        toValue: Number(result.toFixed(6)),
        category,
        formula: `${value} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`,
      };
    }

    // Find the mathjs base unit strings
    const cat = UNIT_CATEGORIES[category];
    if (!cat) throw new Error(`未知类别: ${category}`);

    const fromDef = cat.find((u) => u.key === fromUnit);
    const toDef = cat.find((u) => u.key === toUnit);
    if (!fromDef || !toDef) throw new Error(`不支持的单位转换: ${fromUnit}→${toUnit}`);

    // Use mathjs unit conversion
    const fromMath = math.unit(value, fromDef.baseUnit);
    const converted = fromMath.toNumber(toDef.baseUnit as any);

    result = typeof converted === 'number' ? converted : Number(converted);

    return {
      from: fromUnit,
      fromValue: value,
      to: toUnit,
      toValue: Number(result.toFixed(6)),
      category,
      formula: `${value} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`,
    };
  } catch (err: any) {
    throw new Error(`单位换算错误: ${err.message}`);
  }
}

export function convertAll(
  value: number,
  fromUnit: string,
  category: string,
): { unit: string; value: number; nameCN: string }[] {
  const cat = UNIT_CATEGORIES[category];
  if (!cat) throw new Error(`未知类别: ${category}`);

  return cat.map((def) => {
    if (def.key === fromUnit) {
      return { unit: def.key, value, nameCN: def.nameCN };
    }
    const result = convertUnit(value, fromUnit, def.key, category);
    return { unit: def.key, value: result.toValue, nameCN: def.nameCN };
  });
}

export function getCategories() {
  return Object.entries(UNIT_CATEGORIES).map(([key, units]) => ({
    category: key,
    nameCN: CATEGORY_NAMES[key] || key,
    isFree: FREE_CATEGORIES.has(key),
    units: units.map((u) => ({ key: u.key, nameCN: u.nameCN })),
  }));
}

export function isPremiumCategory(category: string): boolean {
  return !FREE_CATEGORIES.has(category);
}

const CATEGORY_NAMES: Record<string, string> = {
  length: '长度',
  weight: '重量',
  temperature: '温度',
  area: '面积',
  volume: '体积',
  speed: '速度',
  pressure: '压强',
  power: '功率',
  data: '数据存储',
  angle: '角度',
  time: '时间',
  fuel: '燃料效率',
};
