/**
 * Color Palette Service (100% On-Device, Instant)
 * Extracts, clusters, and analyzes hex, rgb, and hsl colors.
 * Calculates WCAG 2.1 contrast ratios and formats into CSS/Tailwind tokens.
 */

export interface ColorDetails {
  hex: string;
  rgb: string;
  hsl: string;
  tailwind: string;
  contrastWhite: number;
  contrastBlack: number;
  wcagWhiteRating: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  wcagBlackRating: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  isLight: boolean;
}

export function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Relative luminance for WCAG 2.1
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(lum1: number, lum2: number): number {
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function getWcagRating(ratio: number): 'AAA' | 'AA' | 'AA Large' | 'Fail' {
  if (ratio >= 7.0) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3.0) return 'AA Large';
  return 'Fail';
}

export function analyzeColor(hexInput: string): ColorDetails | null {
  const rgb = parseHexToRgb(hexInput);
  if (!rgb) return null;

  const hexFormatted = '#' + hexInput.replace('#', '').toLowerCase();
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lum = getLuminance(rgb.r, rgb.g, rgb.b);
  const lumWhite = getLuminance(255, 255, 255);
  const lumBlack = getLuminance(0, 0, 0);

  const contrastWhite = getContrastRatio(lum, lumWhite);
  const contrastBlack = getContrastRatio(lum, lumBlack);

  return {
    hex: hexFormatted,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    tailwind: `bg-[${hexFormatted}]`,
    contrastWhite,
    contrastBlack,
    wcagWhiteRating: getWcagRating(contrastWhite),
    wcagBlackRating: getWcagRating(contrastBlack),
    isLight: lum > 0.45,
  };
}

export function extractHexColors(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}
