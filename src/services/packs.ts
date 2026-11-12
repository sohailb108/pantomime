import { useCustomStore } from '@/stores/custom';
import { listBuiltinCategories, type CategoryInfo } from './builtinPacks';
import { DIFFICULTIES } from '@/game/types';
import { getPool } from './words';

/** Built-in categories followed by the user's custom ones, with `custom` marking the latter. */
export function listAllCategories(lang: string): (CategoryInfo & { custom: boolean })[] {
  return [
    ...listBuiltinCategories(lang).map((c) => ({ ...c, custom: false })),
    ...useCustomStore()
      .of(lang)
      .categories.map(({ id, name }) => ({ id, name, custom: true })),
  ];
}

/**
 * Categories a game can use: those with a word to draw at every difficulty (otherwise one of their
 * tiles would have nothing to draw). A new custom category stays out until it has enough words, and
 * a built-in one stays out if all of a difficulty's words were hidden (for example by an import).
 */
export function listCategories(lang: string): CategoryInfo[] {
  return listAllCategories(lang).filter((c) =>
    DIFFICULTIES.every((d) => getPool(lang, c.id, d).length > 0),
  );
}
