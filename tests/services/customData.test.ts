import { describe, expect, it } from 'vitest';
import {
  addToList,
  buildExport,
  emptyLang,
  emptyWords,
  isComplete,
  MAX_WORD_LENGTH,
  absorbBuiltinDuplicates,
  findCategoryByName,
  mergeInto,
  place,
  placementOf,
  restoreOrphanedExtras,
  normalizeLang,
  normalizeWord,
  parseImport,
  GOLD_ID,
} from '@/services/customData';

describe('words', () => {
  it('normalizes and rejects empty or too long words', () => {
    expect(normalizeWord('  hello   world ')).toBe('hello world');
    expect(normalizeWord('   ')).toBeNull();
    expect(normalizeWord('x'.repeat(MAX_WORD_LENGTH + 1))).toBeNull();
  });

  it('adds without duplicates, ignoring case', () => {
    const list: string[] = [];
    expect(addToList(list, 'Cat')).toBe('ok');
    expect(addToList(list, ' cat ')).toBe('duplicate');
    expect(addToList(list, '')).toBe('invalid');
    expect(list).toEqual(['Cat']);
  });

  it('a category is complete only with a word at every difficulty', () => {
    const c = { id: 'c-1', name: 'X', words: emptyWords() };
    expect(isComplete(c)).toBe(false);
    c.words[1].push('a');
    c.words[2].push('b');
    expect(isComplete(c)).toBe(false);
    c.words[3].push('c');
    expect(isComplete(c)).toBe(true);
  });
});

describe('export and import', () => {
  const sample = () => {
    const d = emptyLang();
    d.categories.push({
      id: 'c-abc',
      name: 'Sports',
      words: { 1: ['golf'], 2: ['polo'], 3: ['curling'] },
    });
    d.extra.animals = { 1: ['ant'], 2: [], 3: [] };
    d.extra[GOLD_ID] = { 1: ['quokka'], 2: [], 3: [] };
    return d;
  };

  it('round-trips', () => {
    const parsed = parseImport(JSON.stringify(buildExport('en', sample())));
    expect(parsed).toEqual({ ok: true, lang: 'en', data: sample() });
  });

  it('rejects broken files', () => {
    expect(parseImport('nope')).toEqual({ ok: false, error: 'invalid' });
    expect(parseImport('{"custom":false}')).toEqual({ ok: false, error: 'invalid' });
    expect(parseImport('{"custom":true,"lang":"en","schema":2}')).toEqual({
      ok: false,
      error: 'schema',
    });
    const bad = {
      ...buildExport('en', sample()),
      categories: [{ id: '../x', name: 'a', words: {} }],
    };
    expect(parseImport(JSON.stringify(bad))).toEqual({ ok: false, error: 'invalid' });
  });

  it('drops invalid words and duplicates but keeps the rest', () => {
    const file = {
      ...buildExport('en', emptyLang()),
      extra: { gold: { 1: ['ok', 'OK', 5, '', 'x'.repeat(MAX_WORD_LENGTH + 10)], 2: [], 3: [] } },
    };
    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.ok && parsed.data.extra[GOLD_ID]![1]).toEqual(['ok']);
  });

  it('rejects oversized lists', () => {
    const file = {
      ...buildExport('en', emptyLang()),
      extra: { gold: { 1: Array.from({ length: 2001 }, (_, i) => `w${i}`), 2: [], 3: [] } },
    };
    expect(parseImport(JSON.stringify(file))).toEqual({ ok: false, error: 'invalid' });
  });

  it('merges by adding only', () => {
    const target = sample();
    const incoming = sample();
    incoming.extra[GOLD_ID]![1].push('numbat');
    incoming.categories[0]!.words[1].push('tennis');
    expect(mergeInto(target, incoming)).toBe(2);
    expect(target.extra[GOLD_ID]![1]).toEqual(['quokka', 'numbat']);
    expect(target.categories).toHaveLength(1);
    expect(target.categories[0]!.words[1]).toEqual(['golf', 'tennis']);
  });

  it('merges a category with the same name under a different id', () => {
    const target = sample();
    const incoming = sample();
    incoming.categories[0]!.id = 'c-other';
    incoming.categories[0]!.name = target.categories[0]!.name.toUpperCase();
    incoming.categories[0]!.words[1].push('tennis');
    mergeInto(target, incoming);
    expect(target.categories).toHaveLength(1);
    expect(target.categories[0]!.words[1]).toEqual(['golf', 'tennis']);
  });

  it('merges extra words and placements under ids that name Object properties', () => {
    const target = emptyLang();
    const incoming = emptyLang();
    incoming.extra['constructor'] = { 1: ['a'], 2: [], 3: [] };
    incoming.overrides['constructor'] = { hidden: ['b'], 1: [], 2: [], 3: [] };
    incoming.extraNames['constructor'] = 'Constructor';
    expect(mergeInto(target, incoming)).toBe(1);
    expect(target.extra['constructor']![1]).toEqual(['a']);
    expect(target.overrides['constructor']!.hidden).toEqual(['b']);
    expect(target.extraNames['constructor']).toBe('Constructor');
  });

  it('treats Arabic and Persian letter variants as the same word', () => {
    const list: string[] = [];
    expect(addToList(list, 'کتاب')).toBe('ok');
    expect(addToList(list, 'كتاب')).toBe('duplicate');
    expect(addToList(list, 'ماهي')).toBe('ok');
    expect(addToList(list, 'ماهی')).toBe('duplicate');
  });
});

describe('legacy category color', () => {
  it('is dropped when normalizing old saves', () => {
    const old = { categories: [{ id: 'c-1', name: 'X', color: '#000000', words: emptyWords() }] };
    const lang = normalizeLang(old);
    expect(lang.categories[0]).not.toHaveProperty('color');
  });
});

describe('built-in category merging', () => {
  const builtins = [{ id: 'animals', name: 'Animals' }];

  it('merges a same-named custom category and remembers its name', () => {
    const data = normalizeLang({});
    const words = emptyWords();
    words[1].push('cat');
    data.categories.push({ id: 'c-1', name: 'animals', words });
    expect(absorbBuiltinDuplicates(data, builtins)).toBe(1);
    expect(data.categories).toEqual([]);
    expect(data.extra.animals![1]).toEqual(['cat']);
    expect(data.extraNames.animals).toBe('animals');
  });

  it('restores extras of a removed built-in category as a custom category', () => {
    const data = normalizeLang({});
    data.extra.zoo = emptyWords();
    data.extra.zoo[2].push('lion');
    data.extraNames.zoo = 'Zoo';
    data.extra.empty = emptyWords();
    expect(restoreOrphanedExtras(data, builtins, () => 'c-new')).toBe(1);
    expect(data.categories).toEqual([
      { id: 'c-new', name: 'Zoo', words: { 1: [], 2: ['lion'], 3: [] } },
    ]);
    expect(data.extra).toEqual({});
    expect(data.extraNames).toEqual({});
  });

  it('keeps the gold pool, which is a built-in category without a tile', () => {
    const data = normalizeLang({});
    data.extra[GOLD_ID] = { 1: ['quokka'], 2: [], 3: [] };
    place(data, GOLD_ID, 'nostalgia', 'hidden');
    expect(restoreOrphanedExtras(data, builtins, () => 'c-new')).toBe(0);
    expect(data.categories).toEqual([]);
    expect(data.extra[GOLD_ID][1]).toEqual(['quokka']);
    expect(placementOf(data, GOLD_ID, 'nostalgia')).toBe('hidden');
  });

  it('falls back to the old id as the name when none was saved', () => {
    const data = normalizeLang({});
    data.extra.zoo = emptyWords();
    data.extra.zoo[1].push('lion');
    restoreOrphanedExtras(data, builtins, () => 'c-new');
    expect(data.categories[0]!.name).toBe('zoo');
  });

  it('keeps names through export and import', () => {
    const data = normalizeLang({});
    data.extraNames.animals = 'Animals';
    const parsed = parseImport(JSON.stringify(buildExport('en', data)));
    expect(parsed.ok && parsed.data.extraNames).toEqual({ animals: 'Animals' });
  });

  it('finds categories by name, ignoring case and one id', () => {
    const customs = [{ id: 'c-1', name: 'Sports' }];
    expect(findCategoryByName('ANIMALS', builtins, customs)).toEqual({
      id: 'animals',
      builtin: true,
    });
    expect(findCategoryByName('sports', builtins, customs)).toEqual({ id: 'c-1', builtin: false });
    expect(findCategoryByName('sports', builtins, customs, 'c-1')).toBeUndefined();
  });
});

describe('placing built-in words', () => {
  it('keeps a word in one place at a time, ignoring case', () => {
    const d = emptyLang();
    expect(placementOf(d, 'animals', 'Cat')).toBe('native');
    place(d, 'animals', 'Cat', 2);
    expect(placementOf(d, 'animals', 'cat')).toBe(2);
    place(d, 'animals', 'cat', 'hidden');
    expect(placementOf(d, 'animals', 'Cat')).toBe('hidden');
    expect(d.overrides.animals).toEqual({ hidden: ['cat'], 1: [], 2: [], 3: [] });
  });

  it('drops the category entry once nothing is placed', () => {
    const d = emptyLang();
    place(d, 'animals', 'cat', 3);
    place(d, 'animals', 'cat', 'native');
    expect(d.overrides).toEqual({});
  });

  it('works for category ids that name Object properties', () => {
    const d = emptyLang();
    place(d, 'constructor', 'cat', 1);
    expect(placementOf(d, 'constructor', 'cat')).toBe(1);
    expect(placementOf(d, 'toString', 'cat')).toBe('native');
    place(d, 'constructor', 'cat', 'native');
    expect(Object.hasOwn(d.overrides, 'constructor')).toBe(false);
  });

  it('lets the incoming placement win in a merge', () => {
    const target = emptyLang();
    place(target, 'animals', 'cat', 'hidden');
    place(target, 'animals', 'dog', 1);
    const incoming = emptyLang();
    place(incoming, 'animals', 'cat', 3);
    mergeInto(target, incoming);
    expect(placementOf(target, 'animals', 'cat')).toBe(3);
    expect(placementOf(target, 'animals', 'dog')).toBe(1);
    expect(target.overrides.animals!.hidden).toEqual([]);
  });

  it('round-trips through export and import', () => {
    const d = emptyLang();
    place(d, 'animals', 'cat', 'hidden');
    place(d, 'animals', 'dog', 3);
    const parsed = parseImport(JSON.stringify(buildExport('en', d)));
    expect(parsed).toEqual({ ok: true, lang: 'en', data: d });
  });

  it('keeps a word listed twice in a file in the first list only', () => {
    const file = {
      ...buildExport('en', emptyLang()),
      overrides: { animals: { hidden: ['cat'], 1: ['Cat', 'dog'], 2: ['dog'], 3: [] } },
    };
    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.ok && parsed.data.overrides.animals).toEqual({
      hidden: ['cat'],
      1: ['dog'],
      2: [],
      3: [],
    });
  });

  it('rejects placements under a bad category id or in a bad shape', () => {
    const bad = (overrides: unknown) =>
      parseImport(JSON.stringify({ ...buildExport('en', emptyLang()), overrides }));
    expect(bad({ '../x': { hidden: [] } })).toEqual({ ok: false, error: 'invalid' });
    expect(bad({ animals: 'cat' })).toEqual({ ok: false, error: 'invalid' });
    expect(bad({ animals: { hidden: 'cat' } })).toEqual({ ok: false, error: 'invalid' });
  });

  it('drops placements of categories that no longer exist', () => {
    const data = normalizeLang({});
    place(data, 'zoo', 'lion', 2);
    place(data, 'animals', 'cat', 'hidden');
    restoreOrphanedExtras(data, [{ id: 'animals' }], () => 'c-new');
    expect(Object.keys(data.overrides)).toEqual(['animals']);
  });

  it('ignores saved fields it does not know', () => {
    const saved = { gold: ['x'], hiddenGold: ['y'], hidden: { animals: {} } } as never;
    expect(normalizeLang(saved)).toEqual(emptyLang());
  });
});
