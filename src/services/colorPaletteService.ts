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

export interface SavedColorPalette {
  id: string;
  name: string;
  colors: string[];
  createdAt: number;
}

const PALETTE_VAULT_KEY = 'dopenotch_palette_vault_v1';

const DEFAULT_PALETTES: SavedColorPalette[] = [
  {
    id: 'preset-liquid-glass',
    name: 'Liquid Glass Dark',
    colors: ['#0a0a0c', '#141418', '#38bdf8', '#f59e0b', '#10b981'],
    createdAt: 1730000000000,
  },
  {
    id: 'preset-linear-aurora',
    name: 'Aurora Accent',
    colors: ['#090d16', '#6366f1', '#a855f7', '#ec4899', '#f8fafc'],
    createdAt: 1730000001000,
  },
];

export function loadSavedPalettes(): SavedColorPalette[] {
  try {
    const raw = localStorage.getItem(PALETTE_VAULT_KEY);
    if (!raw) return DEFAULT_PALETTES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PALETTES;
  } catch {
    return DEFAULT_PALETTES;
  }
}

export function saveNamedPalette(name: string, colors: string[]): SavedColorPalette[] {
  const cleanName = name.trim() || `Palette ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const normalizedColors = Array.from(
    new Set(
      colors
        .map((c) => (c.startsWith('#') ? c.toLowerCase() : `#${c.toLowerCase()}`))
        .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c))
    )
  );
  const current = loadSavedPalettes();
  const nextItem: SavedColorPalette = {
    id: `pal-${Date.now()}`,
    name: cleanName,
    colors: normalizedColors.length > 0 ? normalizedColors : ['#f59e0b', '#38bdf8', '#10b981'],
    createdAt: Date.now(),
  };
  const updated = [nextItem, ...current];
  try {
    localStorage.setItem(PALETTE_VAULT_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function addColorToPalette(paletteId: string, hex: string): SavedColorPalette[] {
  const cleanHex = hex.startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
  const current = loadSavedPalettes();
  const updated = current.map((p) => {
    if (p.id !== paletteId) return p;
    if (p.colors.includes(cleanHex)) return p;
    return { ...p, colors: [...p.colors, cleanHex] };
  });
  try {
    localStorage.setItem(PALETTE_VAULT_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function deleteSavedPalette(paletteId: string): SavedColorPalette[] {
  const current = loadSavedPalettes();
  const updated = current.filter((p) => p.id !== paletteId);
  try {
    localStorage.setItem(PALETTE_VAULT_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function exportPaletteAsCssVariables(name: string, colors: string[]): string {
  const prefix =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'brand';
  const lines = colors.map((c, idx) => `  --${prefix}-${(idx + 1) * 100}: ${c};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export function exportPaletteAsTailwind(name: string, colors: string[]): string {
  const key =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'brand';
  const entries = colors
    .map((c, idx) => `    '${(idx + 1) * 100}': '${c}',`)
    .join('\n');
  return `// tailwind.config.js\ncolors: {\n  '${key}': {\n${entries}\n  }\n}`;
}

export function exportPaletteAsFigmaSvg(name: string, colors: string[]): string {
  const swatchW = 88;
  const gap = 12;
  const totalW = Math.max(200, colors.length * (swatchW + gap) + gap);
  const rects = colors
    .map((c, idx) => {
      const x = gap + idx * (swatchW + gap);
      return `  <g transform="translate(${x}, 16)">
    <rect width="${swatchW}" height="68" rx="12" fill="${c}" />
    <text x="${swatchW / 2}" y="86" fill="#E4E4E7" font-family="monospace" font-size="11" text-anchor="middle">${c.toUpperCase()}</text>
  </g>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="106" viewBox="0 0 ${totalW} 106" fill="none">
  <rect width="${totalW}" height="106" rx="16" fill="#09090B" name="${name}" />
${rects}
</svg>`;
}

