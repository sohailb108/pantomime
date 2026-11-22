import { useCustomStore } from '@/stores/custom';
import { listBuiltinCategories, type CategoryInfo } from './builtinPacks';
import { DIFFICULTIES, type Content } from '@/game/types';
import { listLearningCategories } from './learningPacks';
import { getPool } from './words';

/** Built-in categories followed by the user's custom ones, with `custom` marking the latter. */
export function listAllCategories(content: Content): (CategoryInfo & { custom: boolean })[] {
  if (content.kind === 'learning') {
    return listLearningCategories(content.lang, content.levels).map((c) => ({ ...c, custom: false }));
  }
  const lang = content.lang;
  return [
    ...listBuiltinCategories(lang).map((c) => ({ ...c, custom: false })),
    ...useCustomStore()
      .of(lang)
      .categories.map(({ id, name }) => ({ id, name, custom: true })),
  ];
}

/** The category with this id, or a stand-in named by its id when it no longer exists. */
export function categoryOrFallback<T extends CategoryInfo>(
  categories: readonly T[],
  id: string,
): T | CategoryInfo {
  return categories.find((c) => c.id === id) ?? { id, name: id };
}

/**
 * Categories a game can use: those with a word to draw at every difficulty (otherwise one of their
 * tiles would have nothing to draw). A new custom category stays out until it has enough words, and
 * a built-in one stays out if all of a difficulty's words were hidden (for example by an import).
 */
export function listCategories(content: Content): (CategoryInfo & { custom: boolean })[] {
  return listAllCategories(content).filter((c) =>
    DIFFICULTIES.every((d) => getPool(content, c.id, d).length > 0),
  );
}

/** Number of words a game can draw from a category, over all three difficulties. */
export function categoryWordCount(content: Content, id: string): number {
  return DIFFICULTIES.reduce((sum, d) => sum + getPool(content, id, d).length, 0);
}
