import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCustomStore } from '@/stores/custom';
import { listBuiltinCategories } from '@/services/builtinPacks';
import {
  categoryOrFallback,
  categoryWordCount,
  listAllCategories,
  listCategories,
} from '@/services/packs';
import {
  builtinGoldWords,
  builtinWords,
  getGoldPool,
  getPool,
  hidePoolWord,
  restorePoolWord,
} from '@/services/words';
import { stubLocalStorage } from '../helpers/storage';

beforeEach(() => {
  stubLocalStorage();
  setActivePinia(createPinia());
});

describe('word pools', () => {
  const word = builtinWords('en', 'animals', 1)[0]!;

  it('reads built-in words, and nothing for unknown packs', () => {
    expect(word).toBeTruthy();
    expect(builtinWords('en', 'no-such', 1)).toEqual([]);
    expect(builtinWords('xx', 'animals', 1)).toEqual([]);
    expect(builtinGoldWords('en').length).toBeGreaterThan(0);
    expect(builtinGoldWords('xx')).toEqual([]);
  });

  it('adds custom words and leaves out hidden built-in ones', () => {
    const custom = useCustomStore();
    custom.addWord('en', 'animals', 1, 'zebra-x');
    expect(getPool('en', 'animals', 1)).toContain('zebra-x');
    const result = hidePoolWord('en', 'animals', 1, word);
    expect(result).toEqual({ builtin: true, custom: false });
    expect(getPool('en', 'animals', 1)).not.toContain(word);
    restorePoolWord('en', 'animals', 1, word, result);
    expect(getPool('en', 'animals', 1)).toContain(word);
  });

  it('removes a custom word when hiding it and puts it back on restore', () => {
    useCustomStore().addWord('en', 'animals', 1, 'zebra-x');
    const result = hidePoolWord('en', 'animals', 1, 'zebra-x');
    expect(result).toEqual({ builtin: false, custom: true });
    expect(getPool('en', 'animals', 1)).not.toContain('zebra-x');
    restorePoolWord('en', 'animals', 1, 'zebra-x', result);
    expect(getPool('en', 'animals', 1)).toContain('zebra-x');
  });

  it('builds the gold pool from built-in and custom words', () => {
    const base = getGoldPool('en').length;
    useCustomStore().addGold('en', 'extra gold');
    expect(getGoldPool('en')).toHaveLength(base + 1);
  });
});

describe('categories', () => {
  it('lists built-in categories first, then custom ones', () => {
    const custom = useCustomStore();
    const c = custom.addCategory('en', 'Mine')!;
    const all = listAllCategories('en');
    expect(all.slice(0, listBuiltinCategories('en').length).every((x) => !x.custom)).toBe(true);
    expect(all.at(-1)).toEqual({ id: c.id, name: 'Mine', custom: true });
  });

  it('offers only categories with a word at every difficulty', () => {
    const custom = useCustomStore();
    const c = custom.addCategory('en', 'Mine')!;
    expect(listCategories('en').some((x) => x.id === c.id)).toBe(false);
    custom.addWord('en', c.id, 1, 'a');
    custom.addWord('en', c.id, 2, 'b');
    custom.addWord('en', c.id, 3, 'c');
    expect(listCategories('en').some((x) => x.id === c.id)).toBe(true);
  });

  it('counts words over all difficulties', () => {
    const expected = [1, 2, 3].reduce(
      (n, d) => n + builtinWords('en', 'animals', d as 1 | 2 | 3).length,
      0,
    );
    expect(categoryWordCount('en', 'animals')).toBe(expected);
  });

  it('names a missing category by its id', () => {
    const list = [{ id: 'a', name: 'A' }];
    expect(categoryOrFallback(list, 'a').name).toBe('A');
    expect(categoryOrFallback(list, 'gone')).toEqual({ id: 'gone', name: 'gone' });
  });
});
