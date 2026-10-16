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
  krw: 0.00073,
  btc: 66000.0,
  eth: 2600.0,
};

export function evaluateQuickCalc(rawInput: string): CalcResult | null {
  const input = rawInput.trim();
  if (!input) return null;

  // Clean prefix if starting with /calc
  const query = input.replace(/^\/calc\s*/i, '').trim();
  if (!query) return null;

  // 1. CSS Conversions (e.g. 16px to rem, 2.5rem to px, 14pt to px)
  const cssMatch = query.match(/^([\d.]+)\s*(px|rem|pt|em)\s*(?:to|in|=)?\s*(px|rem|pt|em)$/i);
  if (cssMatch) {
    const val = parseFloat(cssMatch[1]);
    const fromUnit = cssMatch[2].toLowerCase();
    const toUnit = cssMatch[3].toLowerCase();

    if (!isNaN(val)) {
      // Base pixel value (assuming 16px root)
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

  // 2. Currency Conversions (e.g. 120 usd to eur, 50 gbp in usd, 1000 jpy to eur)
  const currMatch = query.match(/^([\d.]+)\s*([a-zA-Z]{3})\s*(?:to|in|=)\s*([a-zA-Z]{3})$/i);
  if (currMatch) {
    const amount = parseFloat(currMatch[1]);
    const fromCurr = currMatch[2].toLowerCase();
    const toCurr = currMatch[3].toLowerCase();

    if (!isNaN(amount) && CURRENCY_RATES_TO_USD[fromCurr] && CURRENCY_RATES_TO_USD[toCurr]) {
      const inUsd = amount * CURRENCY_RATES_TO_USD[fromCurr];
      const targetVal = inUsd / CURRENCY_RATES_TO_USD[toCurr];
      const formatted = targetVal >= 100 ? targetVal.toFixed(2) : targetVal >= 1 ? targetVal.toFixed(3) : targetVal.toFixed(6);

      return {
        query,
        result: `${formatted} ${toCurr.toUpperCase()}`,
        detail: `${amount} ${fromCurr.toUpperCase()} ≈ ${formatted} ${toCurr.toUpperCase()}`,
        category: 'currency',
      };
    }
  }

  // 3. Units: Temperature (e.g. 72 f to c, 100 c to f)
  const tempMatch = query.match(/^([+-]?[\d.]+)\s*(?:°)?\s*(c|f|celsius|fahrenheit)\s*(?:to|in|=)\s*(?:°)?\s*(c|f|celsius|fahrenheit)$/i);
  if (tempMatch) {
    const val = parseFloat(tempMatch[1]);
    const from = tempMatch[2].toLowerCase().startsWith('c') ? 'c' : 'f';
    const to = tempMatch[3].toLowerCase().startsWith('c') ? 'c' : 'f';

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

  // 4. Units: Length & Weight & Data Storage
  const unitMatch = query.match(/^([\d.]+)\s*(km|miles|mi|m|ft|feet|cm|inch|inches|kg|lbs|pounds|mb|gb|tb|kb)\s*(?:to|in|=)\s*(km|miles|mi|m|ft|feet|cm|inch|inches|kg|lbs|pounds|mb|gb|tb|kb)$/i);
  if (unitMatch) {
    const val = parseFloat(unitMatch[1]);
    const from = unitMatch[2].toLowerCase();
    const to = unitMatch[3].toLowerCase();

    let res: number | null = null;
    let label = to;

    // Length
    if ((from === 'km') && (to === 'miles' || to === 'mi')) res = val * 0.621371;
    else if ((from === 'miles' || from === 'mi') && to === 'km') res = val * 1.60934;
    else if ((from === 'm') && (to === 'ft' || to === 'feet')) res = val * 3.28084;
    else if ((from === 'ft' || from === 'feet') && to === 'm') res = val * 0.3048;
    else if ((from === 'cm') && (to === 'inch' || to === 'inches')) res = val / 2.54;
    else if ((from === 'inch' || from === 'inches') && to === 'cm') res = val * 2.54;

    // Weight
    else if ((from === 'kg') && (to === 'lbs' || to === 'pounds')) res = val * 2.20462;
    else if ((from === 'lbs' || from === 'pounds') && to === 'kg') res = val / 2.20462;

    // Data Storage
    else if (from === 'mb' && to === 'gb') res = val / 1024;
    else if (from === 'gb' && to === 'mb') res = val * 1024;
    else if (from === 'gb' && to === 'tb') res = val / 1024;
    else if (from === 'tb' && to === 'gb') res = val * 1024;
    else if (from === 'kb' && to === 'mb') res = val / 1024;

    if (res !== null && !isNaN(res)) {
      const formatted = res.toFixed(3).replace(/\.?0+$/, '');
      return {
        query,
        result: `${formatted} ${label}`,
        detail: `${val} ${from} = ${formatted} ${label}`,
        category: 'unit',
      };
    }
  }

  // 5. Percentages (e.g. 15% of 240, 20% on 80)
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

  // 6. Safe Math Expression (e.g. 45 * 12 + 8, sqrt(256), 2^10, 1500 / 3)
  // Only allow digits, arithmetic symbols, parentheses, sqrt, pi, e
  const mathClean = query
    .replace(/\^/g, '**')
    .replace(/\bsqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/gi, 'Math.E');

  if (/^[0-9+\-*/().\s,Math.PIEsqrt**]+$/.test(mathClean) && /[0-9]/.test(mathClean)) {
    try {
      // Safe sandboxed Function evaluation for pure math
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
