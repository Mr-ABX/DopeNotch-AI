import unicodeData from '../data/unicodeSymbols.json';

export interface UnicodeEntry {
  char: string;
  name: string;
  keywords: string[];
  category: string;
}

const symbols: UnicodeEntry[] = unicodeData as UnicodeEntry[];

export function searchUnicodeSymbols(query: string, limit: number = 18): UnicodeEntry[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return symbols.slice(0, limit);
  }

  // Exact char match first
  const exact = symbols.filter((s) => s.char === clean);
  if (exact.length > 0) return exact;

  // Prefix & keyword match
  const matches = symbols.filter((item) => {
    if (item.name.toLowerCase().includes(clean)) return true;
    if (item.keywords.some((k) => k.toLowerCase().includes(clean))) return true;
    if (item.category.toLowerCase().includes(clean)) return true;
    return false;
  });

  return matches.slice(0, limit);
}
