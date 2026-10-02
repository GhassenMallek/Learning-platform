/** Escape a string so it can be embedded literally inside a RegExp. */
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ACCENTS: Record<string, string> = {
  a: 'aàáâãäå',
  c: 'cç',
  e: 'eèéêë',
  i: 'iìíîï',
  o: 'oòóôõö',
  u: 'uùúûü',
  y: 'yýÿ',
  n: 'nñ',
};

/**
 * Case- and accent-insensitive "contains" matcher for user search ("comptabilite" finds "Comptabilité").
 * The input is escaped, so it can never inject regex syntax into a Mongo query.
 */
export function looseRegex(term: string): RegExp {
  const base = term.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().slice(0, 80);
  const pattern = [...base]
    .map((ch) => {
      const cls = ACCENTS[ch.toLowerCase()];
      return cls ? `[${cls}${cls.toUpperCase()}]` : escapeRegex(ch);
    })
    .join('');
  return new RegExp(pattern, 'i');
}

/** URL-safe slug ("Java Programming & OOP" → "java-programming-oop"). Never returns a 24-hex string (reserved for ids). */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  const safe = slug || 'item';
  return /^[a-f\d]{24}$/.test(safe) ? `${safe}-x` : safe;
}
