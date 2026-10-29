import { describe, it, expect } from 'vitest';
import {
  evaluateDevPowerTool,
  slugifyText,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  utf8ToBase64,
  base64ToUtf8,
} from '../devPowerTools';

describe('devPowerTools', () => {
  it('prettifies and minifies JSON accurately', () => {
    const res = evaluateDevPowerTool('/json {"name":"DopeNotch","v":4}');
    expect(res).not.toBeNull();
    expect(res?.isValid).toBe(true);
    expect(res?.primaryOutput).toContain('  "name": "DopeNotch"');

    const min = evaluateDevPowerTool('/minify {"a": 1, "b": 2}');
    expect(min?.primaryOutput).toBe('{"a":1,"b":2}');
  });

  it('encodes and decodes UTF-8 Base64 losslessly', () => {
    const encoded = utf8ToBase64('Hello DopeNotch 🚀');
    expect(base64ToUtf8(encoded)).toBe('Hello DopeNotch 🚀');

    const autoDecode = evaluateDevPowerTool(`/b64 ${encoded}`);
    expect(autoDecode?.primaryOutput).toBe('Hello DopeNotch 🚀');
  });

  it('converts strings across all case styles and slugs', () => {
    expect(toCamelCase('window_snapper_tile')).toBe('windowSnapperTile');
    expect(toSnakeCase('WindowSnapperTile')).toBe('window_snapper_tile');
    expect(toKebabCase('WindowSnapperTile')).toBe('window-snapper-tile');
    expect(slugifyText('DopeNotch v0.4.1 — Ready!')).toBe('dopenotch-v041-ready');
  });

  it('generates valid RFC 4122 UUID v4 strings', () => {
    const res = evaluateDevPowerTool('/uuid');
    expect(res?.primaryOutput).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
