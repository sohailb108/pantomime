import type { Difficulty, Level } from '@/game/types';
import { sortLevels } from '@/game/content';
import { compareKey } from '@/services/customData';
import type { CategoryInfo } from '@/services/builtinPacks';

/** One learning category file: `src/packs/<lang>/learning/<level>/<category>.json`. */
export interface LearningPack {
  id: string;
  lang: string;
  level: Level;
  words: Record<string, string[]>;
  /** Optional acting tips, keyed by a word of the pack. */
  hints?: Record<string, string>;
  /**
   * Translations of the words, by interface language, then word. A word with several meanings lists
   * the most common ones in one string, in the style of that language ("castle / lock").
   */
  glosses?: Record<string, Record<string, string>>;
}

/** `src/packs/<lang>/learning/index.json`: the categories and the levels that have a file for each. */
export interface LearningIndex {
  schema: number;
  lang: string;
  categories: { id: string; name: string; levels: Level[] }[];
}

/** Learning packs of the files given, keyed by path. Built from globs below, from fixtures in tests. */
export function createLearningPacks(
  files: Record<string, LearningPack>,
  indexes: Record<string, LearningIndex>,
) {
  /** Pack files by "lang/level/category", built once. */
  const packs = new Map<string, LearningPack>();
  for (const [path, pack] of Object.entries(files)) {
    const match = /\/packs\/([^/]+)\/learning\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (match) packs.set(`${match[1]}/${match[2]}/${match[3]}`, pack);
  }
  const indexByLang = new Map<string, LearningIndex>();
  for (const [path, index] of Object.entries(indexes)) {
    const match = /\/packs\/([^/]+)\/learning\/index\.json$/.exec(path);
    if (match) indexByLang.set(match[1]!, index);
  }

  /** Whether a language has any learning packs. */
  function hasLearning(lang: string): boolean {
    return (indexByLang.get(lang)?.categories.length ?? 0) > 0;
  }

  /** Levels a language has at least one category file for, in CEFR order. */
  function learningLevels(lang: string): Level[] {
    const levels = new Set<string>();
    for (const c of indexByLang.get(lang)?.categories ?? []) {
      for (const level of c.levels) if (packs.has(`${lang}/${level}/${c.id}`)) levels.add(level);
    }
    return sortLevels([...levels]);
  }

  /** Categories that have a file at one or more of the levels, named in the word language. */
  function listLearningCategories(lang: string, levels: readonly Level[]): CategoryInfo[] {
    return (indexByLang.get(lang)?.categories ?? [])
      .filter((c) => levels.some((level) => packs.has(`${lang}/${level}/${c.id}`)))
      .map(({ id, name }) => ({ id, name }));
  }

  /** The words of one category at one level and difficulty. */
  function learningWords(
    lang: string,
    level: Level,
    categoryId: string,
    difficulty: Difficulty,
  ): string[] {
    return packs.get(`${lang}/${level}/${categoryId}`)?.words[String(difficulty)] ?? [];
  }

  /**
   * The words of a category at one difficulty over several levels, in level order, without
   * repeats (compared the way the word lists compare them).
   */
  function mergedLearningWords(
    lang: string,
    levels: readonly Level[],
    categoryId: string,
    difficulty: Difficulty,
  ): string[] {
    const seen = new Set<string>();
    return sortLevels(levels)
      .flatMap((level) => learningWords(lang, level, categoryId, difficulty))
      .filter((w) => {
        const key = compareKey(w);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  /** Entry of a word in a list keyed by words, matched the way word lists compare. */
  function entryFor<T>(list: Record<string, T> | undefined, word: string): T | undefined {
    if (!list) return undefined;
    const key = compareKey(word);
    return Object.entries(list).find(([w]) => compareKey(w) === key)?.[1];
  }

  /**
   * The hint of a word, from the first level that has one: its translation into `appLang`, else its
   * acting tip, else null.
   */
  function learningHint(
    lang: string,
    levels: readonly Level[],
    categoryId: string,
    word: string,
    appLang?: string,
  ): string | null {
    for (const level of sortLevels(levels)) {
      const pack = packs.get(`${lang}/${level}/${categoryId}`);
      const gloss = appLang ? entryFor(pack?.glosses?.[appLang], word) : undefined;
      if (gloss) return gloss;
      const tip = entryFor(pack?.hints, word);
      if (tip) return tip;
    }
    return null;
  }

  return {
    hasLearning,
    learningLevels,
    listLearningCategories,
    learningWords,
    mergedLearningWords,
    learningHint,
  };
}

const files = import.meta.glob<LearningPack>('@/packs/*/learning/*/*.json', {
  eager: true,
  import: 'default',
});
const indexes = import.meta.glob<LearningIndex>('@/packs/*/learning/index.json', {
  eager: true,
  import: 'default',
});

export const {
  hasLearning,
  learningLevels,
  listLearningCategories,
  learningWords,
  mergedLearningWords,
  learningHint,
} = createLearningPacks(files, indexes);
