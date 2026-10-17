// Quick Unit & Currency Converter and Local Math Calculator
// 100% Free, 0ms, Zero Dependencies, Zero Network Requests

export interface CalcResult {
  query: string;
  result: string;
  detail: string;
  category: 'math' | 'css' | 'currency' | 'unit' | 'data';
}

const CURRENCY_RATES_TO_USD: Record<string, number> = {
  usd: 1.0,
  eur: 1.08,
  gbp: 1.29,
  jpy: 0.0066,
  cad: 0.73,
  aud: 0.66,
  chf: 1.13,
  cny: 0.14,
  inr: 0.012,
  pkr: 0.0036,
  aed: 0.27,
  sar: 0.27,
  krw: 0.00073,
  btc: 67000.0,
  eth: 2600.0,
  sol: 155.0,
};

const SYMBOL_MAP: Record<string, string> = {
  '$': 'usd',
  '€': 'eur',
  '£': 'gbp',
  '¥': 'jpy',
  '₹': 'inr',
  'c$': 'cad',
  'a$': 'aud',
  '₩': 'krw',
};

export function evaluateQuickCalc(rawInput: string): CalcResult | null {
  const input = rawInput.trim();
  if (!input) return null;

  // Clean prefix if starting with /calc, calc, or convert
  let query = input.replace(/^(?:\/calc|calc|convert)\s*/i, '').trim();
  if (!query) return null;

  // Normalize currency symbols: e.g. "$122 to eur" -> "122 usd to eur", "€50" -> "50 eur"
  let normQuery = query;
  // Handle prefix symbol with number: e.g. "$122" -> "122 $"
  normQuery = normQuery.replace(/([$€£¥₹₩]|c\$|a\$)\s*([\d.]+)/gi, '$2 $1');
  // Handle postfix symbol with number: e.g. "122$" -> "122 $"
  normQuery = normQuery.replace(/([\d.]+)\s*([$€£¥₹₩]|c\$|a\$)/gi, '$1 $2');

  for (const [sym, code] of Object.entries(SYMBOL_MAP)) {
    if (normQuery.toLowerCase().includes(sym)) {
      normQuery = normQuery.replace(new RegExp(sym.replace('$', '\\$'), 'gi'), ` ${code} `);
    }
  }
  normQuery = normQuery.replace(/\s+/g, ' ').trim();

  // =========================================================================
  // 1. CURRENCY CONVERSIONS
  // =========================================================================
  // Case A: Full pair (e.g. "122 usd to eur", "$122 to eur", "122 usd in gbp", "120 usd -> jpy", "122 usd = eur")
  const currPairMatch = normQuery.match(/^([\d.]+)\s*([a-zA-Z]{3})\s*(?:to|in|into|=|->)\s*([a-zA-Z]{3})$/i);
  if (currPairMatch) {
    const amount = parseFloat(currPairMatch[1]);
    const fromCurr = currPairMatch[2].toLowerCase();
    const toCurr = currPairMatch[3].toLowerCase();

    if (!isNaN(amount) && CURRENCY_RATES_TO_USD[fromCurr] && CURRENCY_RATES_TO_USD[toCurr]) {
      const inUsd = amount * CURRENCY_RATES_TO_USD[fromCurr];
      const targetVal = inUsd / CURRENCY_RATES_TO_USD[toCurr];
      const formatted = targetVal >= 100 ? targetVal.toFixed(2) : targetVal >= 1 ? targetVal.toFixed(3) : targetVal.toFixed(4);

      return {
        query,
        result: `${formatted} ${toCurr.toUpperCase()}`,
        detail: `${amount} ${fromCurr.toUpperCase()} ≈ ${formatted} ${toCurr.toUpperCase()} (Rate: ${(CURRENCY_RATES_TO_USD[fromCurr] / CURRENCY_RATES_TO_USD[toCurr]).toFixed(4)})`,
        category: 'currency',
      };
    }
  }

  // Case B: Single currency amount (e.g. "122 usd", "122 usd to", "$122", "50 eur", "100 gbp")
  const currSingleMatch = normQuery.match(/^([\d.]+)\s*([a-zA-Z]{3})(?:\s*(?:to|in|into|=|->))?$/i);
  if (currSingleMatch) {
    const amount = parseFloat(currSingleMatch[1]);
    const fromCurr = currSingleMatch[2].toLowerCase();

    if (!isNaN(amount) && CURRENCY_RATES_TO_USD[fromCurr]) {
      const inUsd = amount * CURRENCY_RATES_TO_USD[fromCurr];
      // Target popular currencies to preview
      const targets = fromCurr === 'usd' ? ['eur', 'gbp', 'cad', 'jpy'] : ['usd', 'eur', 'gbp'];
      const conversions = targets.map((t) => {
        const val = inUsd / CURRENCY_RATES_TO_USD[t];
        const fmt = val >= 100 ? val.toFixed(2) : val.toFixed(3);
        return `${fmt} ${t.toUpperCase()}`;
      });

      const primaryTarget = targets[0];
      const primaryVal = inUsd / CURRENCY_RATES_TO_USD[primaryTarget];
      const primaryFmt = primaryVal >= 100 ? primaryVal.toFixed(2) : primaryVal.toFixed(3);

      return {
        query,
        result: `${primaryFmt} ${primaryTarget.toUpperCase()}`,
        detail: `${amount} ${fromCurr.toUpperCase()} ≈ ${conversions.join(' • ')}`,
        category: 'currency',
      };
    }
  }

  // =========================================================================
  // 2. CSS CONVERSIONS (e.g. "16px to rem", "16px", "1.5rem to px", "1.5rem", "14pt")
  // =========================================================================
  const cssPairMatch = query.match(/^([\d.]+)\s*(px|rem|pt|em)\s*(?:to|in|=)?\s*(px|rem|pt|em)$/i);
  if (cssPairMatch) {
    const val = parseFloat(cssPairMatch[1]);
    const fromUnit = cssPairMatch[2].toLowerCase();
    const toUnit = cssPairMatch[3].toLowerCase();

    if (!isNaN(val)) {
      let pxVal = val;
      if (fromUnit === 'rem' || fromUnit === 'em') pxVal = val * 16;
      else if (fromUnit === 'pt') pxVal = val * (96 / 72);

      let converted = pxVal;
      if (toUnit === 'rem' || toUnit === 'em') converted = pxVal / 16;
      else if (toUnit === 'pt') converted = pxVal * (72 / 96);

      const resStr = Number.isInteger(converted) ? `${converted}${toUnit}` : `${converted.toFixed(3).replace(/\.?0+$/, '')}${toUnit}`;
      return {
        query,
        result: resStr,
        detail: `${val}${fromUnit} = ${resStr} (16px base)`,
        category: 'css',
      };
    }
  }

  // Single CSS unit: e.g. "16px", "24px", "1.5rem", "2rem"
  const cssSingleMatch = query.match(/^([\d.]+)\s*(px|rem|pt|em)$/i);
  if (cssSingleMatch) {
    const val = parseFloat(cssSingleMatch[1]);
    const unit = cssSingleMatch[2].toLowerCase();
    if (!isNaN(val)) {
      if (unit === 'px') {
        const remVal = val / 16;
        const resStr = `${remVal.toFixed(3).replace(/\.?0+$/, '')}rem`;
        return {
          query,
          result: resStr,
          detail: `${val}px = ${resStr} (16px base)`,
          category: 'css',
        };
      } else if (unit === 'rem' || unit === 'em') {
        const pxVal = val * 16;
        const resStr = `${pxVal.toFixed(1).replace(/\.0$/, '')}px`;
        return {
          query,
          result: resStr,
          detail: `${val}${unit} = ${resStr} (16px base)`,
          category: 'css',
        };
      }
    }
  }

  // =========================================================================
  // 3. TEMPERATURE CONVERSIONS (e.g. "72 f to c", "72f", "100 c", "100c to f")
  // =========================================================================
  const tempPairMatch = query.match(/^([+-]?[\d.]+)\s*(?:°)?\s*(c|f|celsius|fahrenheit)\s*(?:to|in|=)?\s*(?:°)?\s*(c|f|celsius|fahrenheit)?$/i);
  if (tempPairMatch) {
    const val = parseFloat(tempPairMatch[1]);
    const fromStr = tempPairMatch[2].toLowerCase();
    const toStr = tempPairMatch[3] ? tempPairMatch[3].toLowerCase() : (fromStr.startsWith('c') ? 'f' : 'c');

    const from = fromStr.startsWith('c') ? 'c' : 'f';
    const to = toStr.startsWith('c') ? 'c' : 'f';

    if (!isNaN(val) && from !== to) {
      const converted = from === 'c' ? (val * 9) / 5 + 32 : ((val - 32) * 5) / 9;
      const resStr = `${converted.toFixed(1).replace(/\.0$/, '')}°${to.toUpperCase()}`;
      return {
        query,
        result: resStr,
        detail: `${val}°${from.toUpperCase()} = ${resStr}`,
        category: 'unit',
      };
    }
  }

  // =========================================================================
  // 4. UNITS: LENGTH, WEIGHT, DATA STORAGE
  // =========================================================================
  const unitPairMatch = query.match(/^([\d.]+)\s*(km|miles|mi|m|ft|feet|cm|inch|inches|kg|lbs|pounds|mb|gb|tb|kb)\s*(?:to|in|=)?\s*(km|miles|mi|m|ft|feet|cm|inch|inches|kg|lbs|pounds|mb|gb|tb|kb)?$/i);
  if (unitPairMatch) {
    const val = parseFloat(unitPairMatch[1]);
    const from = unitPairMatch[2].toLowerCase();
    let to = unitPairMatch[3] ? unitPairMatch[3].toLowerCase() : '';

    if (!to) {
      if (from === 'km') to = 'miles';
      else if (from === 'miles' || from === 'mi') to = 'km';
      else if (from === 'kg') to = 'lbs';
      else if (from === 'lbs' || from === 'pounds') to = 'kg';
      else if (from === 'mb') to = 'gb';
      else if (from === 'gb') to = 'tb';
    }

    if (to) {
      let res: number | null = null;
      if ((from === 'km') && (to === 'miles' || to === 'mi')) res = val * 0.621371;
      else if ((from === 'miles' || from === 'mi') && to === 'km') res = val * 1.60934;
      else if ((from === 'm') && (to === 'ft' || to === 'feet')) res = val * 3.28084;
      else if ((from === 'ft' || from === 'feet') && to === 'm') res = val * 0.3048;
      else if ((from === 'cm') && (to === 'inch' || to === 'inches')) res = val / 2.54;
      else if ((from === 'inch' || from === 'inches') && to === 'cm') res = val * 2.54;
      else if ((from === 'kg') && (to === 'lbs' || to === 'pounds')) res = val * 2.20462;
      else if ((from === 'lbs' || from === 'pounds') && to === 'kg') res = val / 2.20462;
      else if (from === 'mb' && to === 'gb') res = val / 1024;
      else if (from === 'gb' && to === 'mb') res = val * 1024;
      else if (from === 'gb' && to === 'tb') res = val / 1024;
      else if (from === 'tb' && to === 'gb') res = val * 1024;
      else if (from === 'kb' && to === 'mb') res = val / 1024;

      if (res !== null && !isNaN(res)) {
        const formatted = res.toFixed(3).replace(/\.?0+$/, '');
        return {
          query,
          result: `${formatted} ${to}`,
          detail: `${val} ${from} = ${formatted} ${to}`,
          category: 'unit',
        };
      }
    }
  }

  // =========================================================================
  // 5. PERCENTAGES (e.g. "15% of 240", "20% on 80", "15% * 200")
  // =========================================================================
  const pctMatch = query.match(/^([\d.]+)%\s*(?:of|on|\*)\s*([\d.]+)$/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const base = parseFloat(pctMatch[2]);
    if (!isNaN(pct) && !isNaN(base)) {
      const res = (pct / 100) * base;
      const formatted = Number.isInteger(res) ? res.toString() : res.toFixed(3).replace(/\.?0+$/, '');
      return {
        query,
        result: formatted,
        detail: `${pct}% of ${base} = ${formatted}`,
        category: 'math',
      };
    }
  }

  // =========================================================================
  // 6. SAFE MATH EXPRESSIONS (e.g. "45 * 12 + 8", "sqrt(256)", "2^10", "1500 / 3")
  // =========================================================================
  const mathClean = query
    .replace(/\^/g, '**')
    .replace(/\bsqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E');

  if (/^[0-9+\-*/().\s,Math.PIEsqrt**]+$/.test(mathClean) && /[0-9]/.test(mathClean)) {
    try {
      const fn = new Function(`"use strict"; return (${mathClean});`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        const formatted = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(4).replace(/\.?0+$/, '');
        return {
          query,
          result: formatted,
          detail: `${query} = ${formatted}`,
          category: 'math',
        };
      }
    } catch {}
  }

  return null;
}
