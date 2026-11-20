import { DIFFICULTIES, type Difficulty } from '@/game/types';
import { compareKey, hasWord, type Placement } from '@/services/customData';
import { useCustomStore } from '@/stores/custom';

interface CategoryPack {
  id: string;
  lang: string;
  words: Record<string, string[]>;
}
interface GoldPack {
  lang: string;
  words: string[];
}

const files = import.meta.glob<CategoryPack | GoldPack>('@/packs/*/*.json', {
  eager: true,
  import: 'default',
});

/** Pack files by "lang/file", built once at load. */
const packsByKey = new Map<string, CategoryPack | GoldPack>();
for (const [path, pack] of Object.entries(files)) {
  const match = /\/packs\/([^/]+)\/([^/]+)\.json$/.exec(path);
  if (match) packsByKey.set(`${match[1]}/${match[2]}`, pack);
}

function find(lang: string, file: string): CategoryPack | GoldPack | undefined {
  return packsByKey.get(`${lang}/${file}`);
}

/** Number of built-in words of one category and difficulty. */
export function builtinWords(lang: string, categoryId: string, difficulty: Difficulty): string[] {
  const pack = find(lang, categoryId) as CategoryPack | undefined;
  return pack?.words[String(difficulty)] ?? [];
}

/** The difficulty the pack gave a built-in word, or null when the category has no such word. */
export function nativeLevel(lang: string, categoryId: string, word: string): Difficulty | null {
  return DIFFICULTIES.find((d) => hasWord(builtinWords(lang, categoryId, d), word)) ?? null;
}

/**
 * Built-in words a game draws at one difficulty: the pack's words as the user placed them. Hidden
 * words are left out, moved words count at the difficulty they were moved to.
 */
export function builtinPool(lang: string, categoryId: string, difficulty: Difficulty): string[] {
  const custom = useCustomStore();
  return DIFFICULTIES.flatMap((native) =>
    builtinWords(lang, categoryId, native).filter((w) => {
      const placement = custom.placementOf(lang, categoryId, w);
      return (placement === 'native' ? native : placement) === difficulty;
    }),
  );
}

/** Words of one category and difficulty: the built-in ones as placed, plus the user's custom words. */
export function getPool(lang: string, categoryId: string, difficulty: Difficulty): string[] {
  const seen = new Set<string>();
  return [
    ...builtinPool(lang, categoryId, difficulty),
    ...useCustomStore().wordsOf(lang, categoryId, difficulty),
  ].filter((w) => {
    const key = compareKey(w);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Where a word shown at a difficulty can go: out of the game, to a difficulty, or back to where the pack put it. */
export type Target = 'hidden' | 'native' | Difficulty;

/** What a change did to a word, so it can be taken back. */
export interface PoolChange {
  lang: string;
  categoryId: string;
  word: string;
  /** The difficulty the word was shown at. */
  level: Difficulty;
  /** The built-in word's place before the change, or null when it is not a built-in word. */
  before: Placement | null;
  /** The custom word of that name: whether it was taken out of `level`, and where it was added. */
  custom: { addedTo: Difficulty | null } | null;
  /** The difficulty the word is at now, or null when it is out of the game. */
  now: Difficulty | null;
}

/**
 * Hides a word or moves it to another difficulty. A built-in word is placed (the pack is never
 * changed), a custom word is removed from its list and added to the other one. Returns null when
 * nothing changed: the word is not in that pool, it already is at the target, or the target's
 * custom list is full (checked first, so a refused move changes nothing).
 * The last word of a pool can be taken out too. Setup then no longer offers that category (see
 * `listCategories`) until a word is put back.
 */
export function changePoolWord(
  lang: string,
  categoryId: string,
  level: Difficulty,
  word: string,
  target: Target,
): PoolChange | null {
  const custom = useCustomStore();
  const isBuiltin = hasWord(builtinPool(lang, categoryId, level), word);
  const isCustom = custom.wordsOf(lang, categoryId, level).includes(word);
  if (!isBuiltin && !isCustom) return null;
  if (target === level) return null;
  // Back to where the pack put it only means something for a word that was placed elsewhere.
  if (target === 'native' && (!isBuiltin || custom.placementOf(lang, categoryId, word) === 'native')) {
    return null;
  }
  const native = nativeLevel(lang, categoryId, word);
  // A built-in word moved to where the pack put it needs no entry at all.
  const place: Placement = target === native ? 'native' : target;

  let customAddedTo: Difficulty | null = null;
  if (isCustom && target !== 'native') {
    if (target !== 'hidden') {
      const result = custom.addWord(lang, categoryId, target, word);
      if (result !== 'ok' && result !== 'duplicate') return null;
      if (result === 'ok') customAddedTo = target;
    }
    custom.removeWord(lang, categoryId, level, word);
  }
  const before = isBuiltin ? custom.placementOf(lang, categoryId, word) : null;
  if (isBuiltin) custom.placeWord(lang, categoryId, word, place);

  const now = target === 'hidden' ? null : target === 'native' ? (isBuiltin ? native : level) : target;
  return {
    lang,
    categoryId,
    word,
    level,
    before,
    custom: isCustom && target !== 'native' ? { addedTo: customAddedTo } : null,
    now,
  };
}

/** Takes a change back: the word is where it was before. */
export function revertPoolChange(change: PoolChange) {
  const { lang, categoryId, word, level } = change;
  const custom = useCustomStore();
  if (change.before !== null) custom.placeWord(lang, categoryId, word, change.before);
  if (change.custom) {
    if (change.custom.addedTo !== null) custom.removeWord(lang, categoryId, change.custom.addedTo, word);
    custom.addWord(lang, categoryId, level, word);
  }
}

/** Built-in gold words. */
export function builtinGoldWords(lang: string): string[] {
  return (find(lang, 'gold') as GoldPack | undefined)?.words ?? [];
}

/** The very hard words used in the gold round: built-in (minus the hidden ones) plus custom. */
export function getGoldPool(lang: string): string[] {
  const custom = useCustomStore();
  const hidden = custom.hiddenGold(lang);
  return [...builtinGoldWords(lang).filter((w) => !hasWord(hidden, w)), ...custom.goldWords(lang)];
}
