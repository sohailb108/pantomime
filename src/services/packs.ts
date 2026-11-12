import { useCustomStore } from '@/stores/custom';
import { listBuiltinCategories, type CategoryInfo } from './builtinPacks';
import { isComplete } from './customData';

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
 * Categories a game can use: built-in ones, plus custom ones that have a word at every difficulty
 * (otherwise one of their tiles would have nothing to draw).
 */
export function listCategories(lang: string): CategoryInfo[] {
  const custom = useCustomStore().of(lang);
  const complete = new Set(custom.categories.filter(isComplete).map((c) => c.id));
  return listAllCategories(lang).filter((c) => !c.custom || complete.has(c.id));
}
