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
  restoreOrphanedExtras,
  normalizeLang,
  normalizeWord,
  parseImport,
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
    d.gold.push('quokka');
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
      gold: ['ok', 'OK', 5, '', 'x'.repeat(MAX_WORD_LENGTH + 10)],
    };
    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.ok && parsed.data.gold).toEqual(['ok']);
  });

  it('rejects oversized lists', () => {
    const file = {
      ...buildExport('en', emptyLang()),
      gold: Array.from({ length: 2001 }, (_, i) => `w${i}`),
    };
    expect(parseImport(JSON.stringify(file))).toEqual({ ok: false, error: 'invalid' });
  });

  it('merges by adding only', () => {
    const target = sample();
    const incoming = sample();
    incoming.gold.push('numbat');
    incoming.categories[0]!.words[1].push('tennis');
    expect(mergeInto(target, incoming)).toBe(2);
    expect(target.gold).toEqual(['quokka', 'numbat']);
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

  it('merges extra and hidden words under ids that name Object properties', () => {
    const target = emptyLang();
    const incoming = emptyLang();
    incoming.extra['constructor'] = { 1: ['a'], 2: [], 3: [] };
    incoming.hidden['constructor'] = { 1: ['b'], 2: [], 3: [] };
    incoming.extraNames['constructor'] = 'Constructor';
    expect(mergeInto(target, incoming)).toBe(1);
    expect(target.extra['constructor']![1]).toEqual(['a']);
    expect(target.hidden['constructor']![1]).toEqual(['b']);
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
