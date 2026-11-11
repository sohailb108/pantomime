import type { Difficulty } from '@/game/types';
import { hasWord } from '@/services/customData';
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

function find(lang: string, file: string): CategoryPack | GoldPack | undefined {
  return Object.entries(files).find(([path]) => path.endsWith(`/packs/${lang}/${file}.json`))?.[1];
}

/** Number of built-in words of one category and difficulty. */
export function builtinWords(lang: string, categoryId: string, difficulty: Difficulty): string[] {
  const pack = find(lang, categoryId) as CategoryPack | undefined;
  return pack?.words[String(difficulty)] ?? [];
}

/** Words of one category and difficulty: built-in (minus the hidden ones) plus the user's custom words. */
export function getPool(lang: string, categoryId: string, difficulty: Difficulty): string[] {
  const custom = useCustomStore();
  const hidden = custom.hiddenOf(lang, categoryId, difficulty);
  return [
    ...builtinWords(lang, categoryId, difficulty).filter((w) => !hasWord(hidden, w)),
    ...custom.wordsOf(lang, categoryId, difficulty),
  ];
}

const distinct = (words: string[]) => new Set(words.map((w) => w.toLocaleLowerCase())).size;

/** What hiding a word changed, so it can be undone. */
export interface HideResult {
  builtin: boolean;
  custom: boolean;
}

/**
 * Takes a word out of the game: a built-in word is hidden, a custom word is removed.
 * Returns null when it is the last word of its pool, which is never taken out.
 */
export function hidePoolWord(
  lang: string,
  categoryId: string,
  difficulty: Difficulty,
  word: string,
): HideResult | null {
  if (distinct(getPool(lang, categoryId, difficulty)) <= 1) return null;
  const custom = useCustomStore();
  const result = {
    builtin: hasWord(builtinWords(lang, categoryId, difficulty), word),
    custom: custom.wordsOf(lang, categoryId, difficulty).includes(word),
  };
  if (result.builtin) custom.hideWord(lang, categoryId, difficulty, word);
  if (result.custom) custom.removeWord(lang, categoryId, difficulty, word);
  return result;
}

export function restorePoolWord(
  lang: string,
  categoryId: string,
  difficulty: Difficulty,
  word: string,
  was: HideResult,
) {
  const custom = useCustomStore();
  if (was.builtin) custom.unhideWord(lang, categoryId, difficulty, word);
  if (was.custom) custom.addWord(lang, categoryId, difficulty, word);
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
