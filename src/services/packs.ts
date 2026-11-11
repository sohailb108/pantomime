import { useCustomStore } from '@/stores/custom';
import { isComplete } from './customData';

export interface CategoryInfo {
  id: string;
  name: string;
}

interface PackIndex {
  schema: number;
  lang: string;
  categories: CategoryInfo[];
}

const indexes = import.meta.glob<PackIndex>('@/packs/*/index.json', {
  eager: true,
  import: 'default',
});

/** Built-in categories of a language. Falls back to an empty list for languages without a pack. */
export function listBuiltinCategories(lang: string): CategoryInfo[] {
  const entry = Object.entries(indexes).find(([path]) => path.includes(`/packs/${lang}/`));
  return entry ? entry[1].categories : [];
}

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
