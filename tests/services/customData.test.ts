import { describe, expect, it } from 'vitest';
import {
  addToList,
  buildExport,
  emptyLang,
  emptyWords,
  isComplete,
  mergeInto,
  normalizeLang,
  normalizeWord,
  parseImport,
} from '@/services/customData';

describe('words', () => {
  it('normalizes and rejects empty or too long words', () => {
    expect(normalizeWord('  hello   world ')).toBe('hello world');
    expect(normalizeWord('   ')).toBeNull();
    expect(normalizeWord('x'.repeat(41))).toBeNull();
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
    const file = { ...buildExport('en', emptyLang()), gold: ['ok', 'OK', 5, '', 'x'.repeat(50)] };
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
});

describe('legacy category color', () => {
  it('is dropped when normalizing old saves', () => {
    const old = { categories: [{ id: 'c-1', name: 'X', color: '#000000', words: emptyWords() }] };
    const lang = normalizeLang(old);
    expect(lang.categories[0]).not.toHaveProperty('color');
  });
});
