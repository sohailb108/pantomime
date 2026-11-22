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
  builtinWords,
  getGoldPool,
  getPool,
  builtinPool,
  changePoolWord,
  GOLD_LEVEL,
  nativeLevel,
  revertPoolChange,
} from '@/services/words';
import { GOLD_ID, MAX_WORDS_PER_LIST } from '@/services/customData';
import { stubLocalStorage } from '../helpers/storage';
import { normalContent } from '@/game/content';

beforeEach(() => {
  stubLocalStorage();
  setActivePinia(createPinia());
});

describe('word pools', () => {
  const word = builtinWords(normalContent('en'), 'animals', 1)[0]!;

  it('reads built-in words, and nothing for unknown packs', () => {
    expect(word).toBeTruthy();
    expect(builtinWords(normalContent('en'), 'no-such', 1)).toEqual([]);
    expect(builtinWords(normalContent('xx'), 'animals', 1)).toEqual([]);
    expect(builtinWords(normalContent('en'), GOLD_ID, GOLD_LEVEL).length).toBeGreaterThan(0);
    expect(builtinWords(normalContent('xx'), GOLD_ID, GOLD_LEVEL)).toEqual([]);
  });

  it('adds custom words and leaves out hidden built-in ones', () => {
    const custom = useCustomStore();
    custom.addWord('en', 'animals', 1, 'zebra-x');
    expect(getPool(normalContent('en'), 'animals', 1)).toContain('zebra-x');
    const change = changePoolWord(normalContent('en'), 'animals', 1, word, 'hidden')!;
    expect(change).toMatchObject({ before: 'native', custom: null, now: null });
    expect(getPool(normalContent('en'), 'animals', 1)).not.toContain(word);
    revertPoolChange(change);
    expect(getPool(normalContent('en'), 'animals', 1)).toContain(word);
  });

  it('removes a custom word when hiding it and puts it back on revert', () => {
    useCustomStore().addWord('en', 'animals', 1, 'zebra-x');
    const change = changePoolWord(normalContent('en'), 'animals', 1, 'zebra-x', 'hidden')!;
    expect(change.before).toBeNull();
    expect(getPool(normalContent('en'), 'animals', 1)).not.toContain('zebra-x');
    revertPoolChange(change);
    expect(getPool(normalContent('en'), 'animals', 1)).toContain('zebra-x');
  });

  it('does nothing for a word that is not in the pool or already at the target', () => {
    expect(changePoolWord(normalContent('en'), 'animals', 1, 'not-a-word', 'hidden')).toBeNull();
    expect(changePoolWord(normalContent('en'), 'animals', 1, word, 1)).toBeNull();
    expect(changePoolWord(normalContent('en'), 'animals', 1, word, 'native')).toBeNull();
    expect(changePoolWord(normalContent('en'), 'animals', 2, word, 3)).toBeNull(); // not shown at level 2
  });

  it('moves a built-in word without changing the pack or listing it as custom', () => {
    const custom = useCustomStore();
    const change = changePoolWord(normalContent('en'), 'animals', 1, word, 3)!;
    expect(change).toMatchObject({ before: 'native', custom: null, now: 3 });
    expect(getPool(normalContent('en'), 'animals', 1)).not.toContain(word);
    expect(getPool(normalContent('en'), 'animals', 3)).toContain(word);
    expect(builtinWords(normalContent('en'), 'animals', 1)).toContain(word);
    expect(custom.wordsOf('en', 'animals', 3)).toEqual([]);
    expect(builtinPool(normalContent('en'), 'animals', 3)).toContain(word);
    expect(nativeLevel(normalContent('en'), 'animals', word)).toBe(1);
    revertPoolChange(change);
    expect(getPool(normalContent('en'), 'animals', 1)).toContain(word);
    expect(getPool(normalContent('en'), 'animals', 3)).not.toContain(word);
    expect(custom.of('en').overrides).toEqual({});
  });

  it('moves a moved word on, and back to its original level', () => {
    const custom = useCustomStore();
    changePoolWord(normalContent('en'), 'animals', 1, word, 3);
    const onward = changePoolWord(normalContent('en'), 'animals', 3, word, 2)!;
    expect(onward.before).toBe(3);
    expect(getPool(normalContent('en'), 'animals', 2)).toContain(word);
    const back = changePoolWord(normalContent('en'), 'animals', 2, word, 'native')!;
    expect(back.now).toBe(1);
    expect(getPool(normalContent('en'), 'animals', 1)).toContain(word);
    expect(custom.of('en').overrides).toEqual({});
    revertPoolChange(back);
    expect(getPool(normalContent('en'), 'animals', 2)).toContain(word);
  });

  it('needs no entry when a word is moved to where the pack put it', () => {
    const custom = useCustomStore();
    changePoolWord(normalContent('en'), 'animals', 1, word, 3);
    changePoolWord(normalContent('en'), 'animals', 3, word, 1);
    expect(custom.of('en').overrides).toEqual({});
  });

  it('hides a moved word at its new level, and shows it again where the pack put it', () => {
    const custom = useCustomStore();
    changePoolWord(normalContent('en'), 'animals', 1, word, 3);
    changePoolWord(normalContent('en'), 'animals', 3, word, 'hidden');
    expect(getPool(normalContent('en'), 'animals', 3)).not.toContain(word);
    expect(custom.hiddenOf('en', 'animals')).toEqual([word]);
    custom.placeWord('en', 'animals', word, 'native');
    expect(getPool(normalContent('en'), 'animals', 1)).toContain(word);
  });

  it('moves a custom word by removing it and adding it at the target', () => {
    const custom = useCustomStore();
    custom.addWord('en', 'animals', 1, 'zebra-x');
    const change = changePoolWord(normalContent('en'), 'animals', 1, 'zebra-x', 2)!;
    expect(change).toMatchObject({ before: null, custom: { addedTo: 2 }, now: 2 });
    expect(custom.wordsOf('en', 'animals', 1)).not.toContain('zebra-x');
    expect(custom.wordsOf('en', 'animals', 2)).toContain('zebra-x');
    revertPoolChange(change);
    expect(custom.wordsOf('en', 'animals', 1)).toContain('zebra-x');
    expect(custom.wordsOf('en', 'animals', 2)).not.toContain('zebra-x');
  });

  it('keeps a copy that was already at the target when a custom move is taken back', () => {
    const custom = useCustomStore();
    custom.addWord('en', 'animals', 1, 'zebra-x');
    custom.addWord('en', 'animals', 2, 'Zebra-X');
    const change = changePoolWord(normalContent('en'), 'animals', 1, 'zebra-x', 2)!;
    expect(change.custom).toEqual({ addedTo: null });
    expect(custom.wordsOf('en', 'animals', 1)).toEqual([]);
    revertPoolChange(change);
    expect(custom.wordsOf('en', 'animals', 1)).toEqual(['zebra-x']);
    expect(custom.wordsOf('en', 'animals', 2)).toEqual(['Zebra-X']);
  });

  it('refuses a custom move into a full list and changes nothing', () => {
    const custom = useCustomStore();
    custom.addWord('en', 'animals', 1, 'zebra-x');
    const list = custom.data.en!.extra.animals![2];
    for (let i = 0; i < MAX_WORDS_PER_LIST; i++) list.push(`w${i}`);
    expect(changePoolWord(normalContent('en'), 'animals', 1, 'zebra-x', 2)).toBeNull();
    expect(custom.wordsOf('en', 'animals', 1)).toEqual(['zebra-x']);
  });

  it('moves both a custom word and its built-in twin', () => {
    const custom = useCustomStore();
    custom.addWord('en', 'animals', 1, word.toUpperCase());
    const twin = changePoolWord(normalContent('en'), 'animals', 1, word.toUpperCase(), 'hidden')!;
    expect(twin.before).toBe('native');
    expect(twin.custom).toEqual({ addedTo: null });
    expect(getPool(normalContent('en'), 'animals', 1).map((w) => w.toLowerCase())).not.toContain(word.toLowerCase());
    revertPoolChange(twin);
    expect(getPool(normalContent('en'), 'animals', 1).map((w) => w.toLowerCase())).toContain(word.toLowerCase());
  });

  it('draws a word once when a custom word matches a built-in one at the same level', () => {
    useCustomStore().addWord('en', 'animals', 1, word.toUpperCase());
    expect(getPool(normalContent('en'), 'animals', 1).filter((w) => w.toLowerCase() === word.toLowerCase())).toHaveLength(1);
  });

  it('builds the gold pool from built-in and custom words', () => {
    const base = getGoldPool(normalContent('en')).length;
    useCustomStore().addWord('en', GOLD_ID, GOLD_LEVEL, 'extra gold');
    expect(getGoldPool(normalContent('en'))).toHaveLength(base + 1);
  });
});

describe('categories', () => {
  it('lists built-in categories first, then custom ones', () => {
    const custom = useCustomStore();
    const c = custom.addCategory('en', 'Mine')!;
    const all = listAllCategories(normalContent('en'));
    expect(all.slice(0, listBuiltinCategories('en').length).every((x) => !x.custom)).toBe(true);
    expect(all.at(-1)).toEqual({ id: c.id, name: 'Mine', custom: true });
  });

  it('offers only categories with a word at every difficulty', () => {
    const custom = useCustomStore();
    const c = custom.addCategory('en', 'Mine')!;
    expect(listCategories(normalContent('en')).some((x) => x.id === c.id)).toBe(false);
    custom.addWord('en', c.id, 1, 'a');
    custom.addWord('en', c.id, 2, 'b');
    custom.addWord('en', c.id, 3, 'c');
    expect(listCategories(normalContent('en')).some((x) => x.id === c.id)).toBe(true);
  });

  it('counts words over all difficulties', () => {
    const expected = [1, 2, 3].reduce(
      (n, d) => n + builtinWords(normalContent('en'), 'animals', d as 1 | 2 | 3).length,
      0,
    );
    expect(categoryWordCount(normalContent('en'), 'animals')).toBe(expected);
  });

  it('names a missing category by its id', () => {
    const list = [{ id: 'a', name: 'A' }];
    expect(categoryOrFallback(list, 'a').name).toBe('A');
    expect(categoryOrFallback(list, 'gone')).toEqual({ id: 'gone', name: 'gone' });
  });
});
