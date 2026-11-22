import type { Content, Level } from '@/game/types';

export const LEVELS: readonly Level[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

/** Content of normal packs in a language. */
export function normalContent(lang: string): Content {
  return { lang, kind: 'normal', levels: [] };
}

/** Levels in CEFR order, without repeats or unknown values. */
export function sortLevels(levels: readonly string[]): Level[] {
  return LEVELS.filter((l) => levels.includes(l));
}

/**
 * Reads content from a saved value. A save without content (made before learning packs) is normal
 * content in `fallbackLang`; a learning save without a valid level falls back to normal too.
 */
export function readContent(value: unknown, fallbackLang: string): Content {
  const c = value as Partial<Content> | null | undefined;
  if (!c || typeof c.lang !== 'string') return normalContent(fallbackLang);
  if (c.kind === 'learning') {
    const levels = sortLevels(Array.isArray(c.levels) ? (c.levels) : []);
    if (levels.length > 0) return { lang: c.lang, kind: 'learning', levels };
  }
  return normalContent(c.lang);
}

/**
 * Key the seen-history is kept under. Normal packs use the language code (as before). Learning
 * packs add the sorted level set, so playing A1 alone does not erase the history of A1+A2.
 */
export function historyNamespace(content: Content): string {
  if (content.kind === 'normal') return content.lang;
  return `${content.lang}:learning:${sortLevels(content.levels).join('+')}`;
}
