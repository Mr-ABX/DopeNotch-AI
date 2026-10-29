// Developer & Text Power Tools Service
// Instant, zero-API clipboard & query transformers for DopeNotch (/json, /b64, /url, /slug, /case, /uuid, /jwt, /epoch)

export interface DevToolVariant {
  label: string;
  value: string;
  badge?: string;
}

export interface DevToolMatch {
  toolId: 'json' | 'base64' | 'url' | 'slug' | 'case' | 'uuid' | 'jwt' | 'epoch';
  title: string;
  subtitle: string;
  primaryOutput: string;
  primaryLabel: string;
  isValid: boolean;
  error?: string;
  variants: DevToolVariant[];
}

function splitWords(input: string): string[] {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-\s./\\]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function toCamelCase(input: string): string {
  const words = splitWords(input);
  return words
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('');
}

export function toPascalCase(input: string): string {
  return splitWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

export function toSnakeCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toLowerCase())
    .join('_');
}

export function toKebabCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toLowerCase())
    .join('-');
}

export function toConstantCase(input: string): string {
  return splitWords(input)
    .map((w) => w.toUpperCase())
    .join('_');
}

export function toTitleCase(input: string): string {
  return splitWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function slugifyText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const cleaned = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = cleaned.padEnd(cleaned.length + ((4 - (cleaned.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function isLikelyBase64(str: string): boolean {
  const s = str.trim();
  if (s.length < 4 || /\s/.test(s)) return false;
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(s)) return false;
  try {
    const decoded = base64ToUtf8(s);
    // Check that decoded string has printable UTF-8 characters
    return decoded.length > 0 && !/[\x00-\x08\x0E-\x1F]/.test(decoded);
  } catch {
    return false;
  }
}

export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Evaluates a developer slash command in the Notch search bar.
 * Falls back to `clipboardFallback` when the user types only the command (e.g. `/json` or `/b64`).
 */
export function evaluateDevPowerTool(
  rawQuery: string,
  clipboardFallback: string = ''
): DevToolMatch | null {
  const q = rawQuery.trim();
  if (!q.startsWith('/')) return null;

  const match = q.match(/^\/([a-z0-9_-]+)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;

  const cmd = match[1].toLowerCase();
  const explicitArg = (match[2] || '').trim();
  const sourceText = explicitArg || clipboardFallback.trim();

  // 1. JSON Prettify / Minify
  if (cmd === 'json' || cmd === 'prettify' || cmd === 'minify') {
    if (!sourceText) {
      return {
        toolId: 'json',
        title: 'JSON Prettify & Minify',
        subtitle: 'Paste or copy JSON to format, validate, or minify',
        primaryOutput: '{\n  "status": "ready"\n}',
        primaryLabel: 'Sample',
        isValid: true,
        variants: [],
      };
    }
    try {
      const parsed = JSON.parse(sourceText);
      const pretty = JSON.stringify(parsed, null, 2);
      const minified = JSON.stringify(parsed);
      const isMinifyCmd = cmd === 'minify';
      const keyCount =
        parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 0;

      return {
        toolId: 'json',
        title: isMinifyCmd ? 'JSON Minified' : 'JSON Prettified',
        subtitle: `Valid JSON • ${keyCount} ${Array.isArray(parsed) ? 'items' : 'keys'} • ${minified.length} B`,
        primaryOutput: isMinifyCmd ? minified : pretty,
        primaryLabel: isMinifyCmd ? 'Minified' : 'Prettified (2 spaces)',
        isValid: true,
        variants: [
          { label: 'Prettify', value: pretty, badge: `${pretty.split('\n').length} lines` },
          { label: 'Minify', value: minified, badge: `${minified.length} chars` },
          { label: 'Escaped String', value: JSON.stringify(minified), badge: 'Stringified' },
        ],
      };
    } catch (err: any) {
      return {
        toolId: 'json',
        title: 'Invalid JSON Syntax',
        subtitle: err?.message || 'Unable to parse JSON input',
        primaryOutput: sourceText,
        primaryLabel: 'Raw Input',
        isValid: false,
        error: err?.message || 'Syntax Error',
        variants: [],
      };
    }
  }

  // 2. Base64 Encode / Decode
  if (cmd === 'b64' || cmd === 'base64' || cmd === 'encode' || cmd === 'decode') {
    const target = sourceText || 'DopeNotch AI';
    const encoded = utf8ToBase64(target);
    let decoded: string | null = null;
    try {
      if (cmd === 'decode' || isLikelyBase64(target)) {
        decoded = base64ToUtf8(target);
      }
    } catch {
      decoded = null;
    }

    const preferDecode = cmd === 'decode' || (cmd !== 'encode' && decoded !== null);
    const primary = preferDecode && decoded ? decoded : encoded;

    const variants: DevToolVariant[] = [];
    if (decoded !== null) {
      variants.push({ label: 'Decoded UTF-8', value: decoded, badge: 'Decoded' });
    }
    variants.push({ label: 'Base64 Encoded', value: encoded, badge: 'Base64' });
    variants.push({
      label: 'Base64 URL-Safe',
      value: encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
      badge: 'URL-Safe',
    });

    return {
      toolId: 'base64',
      title: preferDecode ? 'Base64 Decoded → UTF-8' : 'UTF-8 → Base64 Encoded',
      subtitle: explicitArg ? 'From query input' : 'From active clipboard',
      primaryOutput: primary,
      primaryLabel: preferDecode ? 'Decoded' : 'Base64',
      isValid: true,
      variants,
    };
  }

  // 3. URL Encode / Decode
  if (cmd === 'url' || cmd === 'urlencode' || cmd === 'urldecode') {
    const target = sourceText || 'https://dopenotch.xbuilds.online/?q=hello world&ai=true';
    const hasEncodedChars = /%[0-9A-Fa-f]{2}/.test(target);
    const preferDecode = cmd === 'urldecode' || (cmd === 'url' && hasEncodedChars);

    let decoded = target;
    try {
      decoded = decodeURIComponent(target);
    } catch {}
    const encoded = encodeURIComponent(target);

    return {
      toolId: 'url',
      title: preferDecode ? 'URL Decoded' : 'URL Component Encoded',
      subtitle: explicitArg ? 'From query input' : 'From active clipboard',
      primaryOutput: preferDecode ? decoded : encoded,
      primaryLabel: preferDecode ? 'Decoded' : 'Encoded',
      isValid: true,
      variants: [
        { label: 'Encoded Component', value: encoded, badge: 'encodeURIComponent' },
        { label: 'Decoded URL', value: decoded, badge: 'decodeURIComponent' },
      ],
    };
  }

  // 4. Slugify
  if (cmd === 'slug' || cmd === 'slugify') {
    const target = sourceText || 'DopeNotch v0.4 Release & Product Launch!';
    const slug = slugifyText(target);
    return {
      toolId: 'slug',
      title: 'URL Slug Generator',
      subtitle: `${slug.length} chars • Clean URL-safe slug`,
      primaryOutput: slug,
      primaryLabel: 'kebab-slug',
      isValid: true,
      variants: [
        { label: 'Hyphen Slug', value: slug, badge: 'kebab' },
        { label: 'Underscore Slug', value: slug.replace(/-/g, '_'), badge: 'snake' },
      ],
    };
  }

  // 5. Case Converter
  if (
    cmd === 'case' ||
    cmd === 'camel' ||
    cmd === 'snake' ||
    cmd === 'kebab' ||
    cmd === 'pascal' ||
    cmd === 'upper' ||
    cmd === 'lower' ||
    cmd === 'constant'
  ) {
    const target = sourceText || 'dope notch power tools';
    const camel = toCamelCase(target);
    const pascal = toPascalCase(target);
    const snake = toSnakeCase(target);
    const kebab = toKebabCase(target);
    const constant = toConstantCase(target);
    const title = toTitleCase(target);
    const lower = target.toLowerCase();
    const upper = target.toUpperCase();

    const mapByCmd: Record<string, { val: string; label: string }> = {
      camel: { val: camel, label: 'camelCase' },
      pascal: { val: pascal, label: 'PascalCase' },
      snake: { val: snake, label: 'snake_case' },
      kebab: { val: kebab, label: 'kebab-case' },
      constant: { val: constant, label: 'CONSTANT_CASE' },
      upper: { val: upper, label: 'UPPERCASE' },
      lower: { val: lower, label: 'lowercase' },
      case: { val: camel, label: 'camelCase' },
    };

    const chosen = mapByCmd[cmd] || mapByCmd.case;

    return {
      toolId: 'case',
      title: `Case Converter (${chosen.label})`,
      subtitle: 'Click any case token to copy & paste immediately',
      primaryOutput: chosen.val,
      primaryLabel: chosen.label,
      isValid: true,
      variants: [
        { label: 'camelCase', value: camel },
        { label: 'snake_case', value: snake },
        { label: 'kebab-case', value: kebab },
        { label: 'PascalCase', value: pascal },
        { label: 'CONSTANT_CASE', value: constant },
        { label: 'Title Case', value: title },
      ],
    };
  }

  // 6. UUID v4 & ID Generator
  if (cmd === 'uuid' || cmd === 'id') {
    const uuid = generateUuidV4();
    const compact = uuid.replace(/-/g, '');
    const upper = uuid.toUpperCase();
    return {
      toolId: 'uuid',
      title: 'UUID v4 Generator',
      subtitle: 'Cryptographically random RFC 4122 identifier',
      primaryOutput: uuid,
      primaryLabel: 'UUID v4',
      isValid: true,
      variants: [
        { label: 'Standard UUID v4', value: uuid, badge: '36 chars' },
        { label: 'Compact Hex', value: compact, badge: '32 chars' },
        { label: 'Uppercase UUID', value: upper, badge: 'UPPER' },
      ],
    };
  }

  // 7. JWT Inspector
  if (cmd === 'jwt') {
    const parts = sourceText.split('.');
    if (parts.length >= 2) {
      try {
        const header = JSON.parse(base64ToUtf8(parts[0]));
        const payload = JSON.parse(base64ToUtf8(parts[1]));
        const formattedPayload = JSON.stringify(payload, null, 2);
        const formattedHeader = JSON.stringify(header, null, 2);
        const expText = payload.exp
          ? `Expires: ${new Date(payload.exp * 1000).toLocaleString()}`
          : 'No exp claim';
        return {
          toolId: 'jwt',
          title: 'JWT Token Inspector',
          subtitle: `Alg: ${header.alg || 'unknown'} • ${expText}`,
          primaryOutput: formattedPayload,
          primaryLabel: 'Payload JSON',
          isValid: true,
          variants: [
            { label: 'Payload JSON', value: formattedPayload, badge: 'Claims' },
            { label: 'Header JSON', value: formattedHeader, badge: header.alg || 'JWT' },
          ],
        };
      } catch (e: any) {
        return {
          toolId: 'jwt',
          title: 'JWT Inspector',
          subtitle: 'Invalid JWT token in input/clipboard',
          primaryOutput: sourceText,
          primaryLabel: 'Invalid JWT',
          isValid: false,
          error: 'Could not decode base64url JWT segments',
          variants: [],
        };
      }
    }
    return {
      toolId: 'jwt',
      title: 'JWT Token Inspector',
      subtitle: 'Copy a JWT or type /jwt <token> to inspect header & claims offline',
      primaryOutput: '',
      primaryLabel: 'Waiting for JWT',
      isValid: false,
      variants: [],
    };
  }

  // 8. Unix Epoch / Timestamp Converter
  if (cmd === 'epoch' || cmd === 'timestamp' || cmd === 'ts') {
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);
    let targetDate = new Date(nowMs);
    if (explicitArg && /^\d+$/.test(explicitArg)) {
      const num = parseInt(explicitArg, 10);
      targetDate = new Date(explicitArg.length <= 10 ? num * 1000 : num);
    }
    const iso = targetDate.toISOString();
    const unixSec = Math.floor(targetDate.getTime() / 1000).toString();
    const unixMs = targetDate.getTime().toString();
    const local = targetDate.toLocaleString();

    return {
      toolId: 'epoch',
      title: 'Unix Timestamp & ISO Converter',
      subtitle: `Local: ${local}`,
      primaryOutput: explicitArg ? iso : unixSec,
      primaryLabel: explicitArg ? 'ISO 8601' : `Now (${nowSec})`,
      isValid: true,
      variants: [
        { label: 'Unix Seconds', value: unixSec, badge: 'sec' },
        { label: 'Unix Millis', value: unixMs, badge: 'ms' },
        { label: 'ISO 8601 UTC', value: iso, badge: 'ISO' },
        { label: 'Local String', value: local, badge: 'Local' },
      ],
    };
  }

  return null;
}
