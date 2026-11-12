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

/** Categories of each language's built-in pack, built once at load. */
const categoriesByLang = new Map<string, CategoryInfo[]>();
for (const [path, index] of Object.entries(indexes)) {
  const match = /\/packs\/([^/]+)\/index\.json$/.exec(path);
  if (match) categoriesByLang.set(match[1]!, index.categories);
}

/**
 * Built-in categories of a language. Falls back to an empty list for languages without a pack.
 * Kept apart from `packs.ts` so the custom store can use it without importing itself back.
 */
export function listBuiltinCategories(lang: string): CategoryInfo[] {
  return categoriesByLang.get(lang) ?? [];
}
