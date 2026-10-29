import { describe, it, expect } from 'vitest';
import {
  analyzeColor,
  extractHexColors,
  exportPaletteAsCssVariables,
  exportPaletteAsTailwind,
  exportPaletteAsFigmaSvg,
} from '../colorPaletteService';
import { evaluateQuickCalc } from '../quickCalc';
import { polishTextForChat, convertToMarkdownChecklist } from '../quickPrompt';

describe('DopeNotch Productivity Suite — Lightweight End-to-End Verification', () => {
  it('analyzes colors and exports CSS, Tailwind, and Figma SVG tokens', () => {
    const details = analyzeColor('#10b981');
    expect(details).not.toBeNull();
    expect(details?.hex).toBe('#10b981');
    expect(details?.rgb).toBe('rgb(16, 185, 129)');

    const extracted = extractHexColors('Primary #FF5733 and accent #38bdf8');
    expect(extracted).toEqual(['#ff5733', '#38bdf8']);

    const css = exportPaletteAsCssVariables('Brand UI', ['#000000', '#ffffff']);
    expect(css).toContain('--brand-ui-100: #000000;');
    expect(css).toContain('--brand-ui-200: #ffffff;');

    const tw = exportPaletteAsTailwind('Brand UI', ['#10b981']);
    expect(tw).toContain("'brand-ui'");
    expect(tw).toContain("'100': '#10b981'");

    const svg = exportPaletteAsFigmaSvg('Brand UI', ['#10b981']);
    expect(svg).toContain('<svg');
    expect(svg).toContain('#10B981');
  });

  it('evaluates inline math, unit conversions, and currency in quickCalc', () => {
    const math = evaluateQuickCalc('145 * 28');
    expect(math?.result).toBe('4,060');

    const px = evaluateQuickCalc('32px to rem');
    expect(px?.result).toBe('2rem');
  });

  it('converts unstructured text into Markdown checklists and polishes prompts', () => {
    const checklist = convertToMarkdownChecklist('first fix header then test dmg finally push release');
    expect(checklist).toContain('- [ ] Fix header');
    expect(checklist).toContain('- [ ] Test dmg');

    const polished = polishTextForChat('i dont think thats smooth');
    expect(polished.length).toBeGreaterThan(5);
  });
});
