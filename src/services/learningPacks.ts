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

  /** The acting tip of a word at the first of the levels that has one, or null. */
  function learningHint(
    lang: string,
    levels: readonly Level[],
    categoryId: string,
    word: string,
  ): string | null {
    const key = compareKey(word);
    for (const level of sortLevels(levels)) {
      const hints = packs.get(`${lang}/${level}/${categoryId}`)?.hints;
      const entry = hints && Object.entries(hints).find(([w]) => compareKey(w) === key);
      if (entry) return entry[1];
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
