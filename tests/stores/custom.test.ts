import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useCustomStore } from '@/stores/custom';
import { GOLD_ID } from '@/services/customData';
import { saveJson } from '@/services/storage';
import { listCategories } from '@/services/packs';
import {
  builtinWords,
  changePoolWord,
  getGoldPool,
  getPool,
  revertPoolChange,
} from '@/services/words';
import { normalContent } from '@/game/content';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}
const fresh = () => {
  setActivePinia(createPinia());
  return useCustomStore();
};

describe('custom store', () => {
  beforeEach(() => void vi.stubGlobal('localStorage', memoryStorage()));

  it('persists categories and words', async () => {
    const a = fresh();
    const id = a.addCategory('en', ' Sports ')!.id;
    expect(a.addWord('en', id, 1, 'golf')).toBe('ok');
    await nextTick();
    const b = fresh();
    expect(b.findCategory('en', id)?.name).toBe('Sports');
    expect(b.wordsOf('en', id, 1)).toEqual(['golf']);
    expect(b.wordsOf('fa', id, 1)).toEqual([]); // per language
  });

  it('adds extra words to built-in categories and gold, and removes them', () => {
    const s = fresh();
    expect(getPool(normalContent('en'), 'animals', 1)).not.toContain('quokka');
    s.addWord('en', 'animals', 1, 'quokka');
    expect(getPool(normalContent('en'), 'animals', 1)).toContain('quokka');
    s.removeWord('en', 'animals', 1, 'quokka');
    expect(getPool(normalContent('en'), 'animals', 1)).not.toContain('quokka');
    s.addWord('en', GOLD_ID, 1, 'numbat');
    expect(getGoldPool(normalContent('en'))).toContain('numbat');
  });

  it('offers a custom category for games only when complete', () => {
    const s = fresh();
    const id = s.addCategory('en', 'Sports')!.id;
    s.addWord('en', id, 1, 'a');
    s.addWord('en', id, 2, 'b');
    expect(listCategories(normalContent('en')).some((c) => c.id === id)).toBe(false);
    s.addWord('en', id, 3, 'c');
    expect(listCategories(normalContent('en')).some((c) => c.id === id)).toBe(true);
    s.removeCategory('en', id);
    expect(listCategories(normalContent('en')).some((c) => c.id === id)).toBe(false);
  });

  it('does not offer a built-in category whose words are all hidden', () => {
    const s = fresh();
    expect(listCategories(normalContent('en')).some((c) => c.id === 'animals')).toBe(true);
    // A crafted import can hide every word of a pool, which the UI itself refuses to do.
    for (const w of builtinWords(normalContent('en'), 'animals', 1)) s.placeWord('en', 'animals', w, 'hidden');
    expect(getPool(normalContent('en'), 'animals', 1)).toEqual([]);
    expect(listCategories(normalContent('en')).some((c) => c.id === 'animals')).toBe(false);
  });

  it('imports into the right language only', () => {
    const a = fresh();
    a.addWord('en', GOLD_ID, 1, 'numbat');
    const file = a.exportJson('en');
    const b = fresh();
    expect(b.importJson('fa', file)).toEqual({ ok: false, error: 'language' });
    expect(b.importJson('en', file)).toEqual({ ok: true, added: 1, merged: 0 });
    expect(b.importJson('en', file)).toEqual({ ok: true, added: 0, merged: 0 });
    expect(b.importJson('en', '{}')).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('hiding built-in words', () => {
  beforeEach(() => void vi.stubGlobal('localStorage', memoryStorage()));

  it('leaves hidden words out of the pool, and restores them', async () => {
    const s = fresh();
    const all = getPool(normalContent('en'), 'food', 1);
    expect(all.length).toBeGreaterThan(1);
    const word = all[0]!;
    s.placeWord('en', 'food', word, 'hidden');
    expect(getPool(normalContent('en'), 'food', 1)).not.toContain(word);
    await nextTick();
    expect(fresh().hiddenOf('en', 'food')).toEqual([word]);
    s.placeWord('en', 'food', word, 'native');
    expect(getPool(normalContent('en'), 'food', 1)).toContain(word);
  });

  it('can hide the last word, which takes the category out of new games', () => {
    fresh();
    for (const w of getPool(normalContent('en'), 'food', 1)) changePoolWord(normalContent('en'), 'food', 1, w, 'hidden');
    expect(getPool(normalContent('en'), 'food', 1)).toHaveLength(0);
    expect(listCategories(normalContent('en')).some((c) => c.id === 'food')).toBe(false);
  });

  it('removes a custom word when hiding it, and restores it', () => {
    const s = fresh();
    s.addWord('en', 'food', 1, 'zzcustom');
    const change = changePoolWord(normalContent('en'), 'food', 1, 'zzcustom', 'hidden')!;
    expect(change.before).toBeNull();
    expect(getPool(normalContent('en'), 'food', 1)).not.toContain('zzcustom');
    revertPoolChange(change);
    expect(getPool(normalContent('en'), 'food', 1)).toContain('zzcustom');
  });

  it('fills the new fields for data saved before hiding existed', () => {
    localStorage.setItem(
      'pantomime:custom',
      JSON.stringify({ version: 1, data: { en: { categories: [], extra: {} } } }),
    );
    const s = fresh();
    expect(s.hiddenOf('en', 'food')).toEqual([]);
    expect(s.hiddenOf('en', GOLD_ID)).toEqual([]);
    expect(s.wordsOf('en', GOLD_ID, 1)).toEqual([]);
  });

  it('exports, imports and merges hidden words', () => {
    const a = fresh();
    a.placeWord('en', 'food', 'pizza', 'hidden');
    a.placeWord('en', GOLD_ID, 'g', 'hidden');
    const text = a.exportJson('en');
    setActivePinia(createPinia());
    const b = useCustomStore();
    expect(b.importJson('en', text).ok).toBe(true);
    expect(b.hiddenOf('en', 'food')).toEqual(['pizza']);
    expect(b.hiddenOf('en', GOLD_ID)).toEqual(['g']);
  });

  it('does not create a category named like a built-in or existing one', () => {
    const s = fresh();
    expect(s.addCategory('en', 'animals')).toEqual({ id: 'animals', existing: true });
    const sports = s.addCategory('en', 'Sports')!;
    expect(s.addCategory('en', ' SPORTS ')).toEqual({ id: sports.id, existing: true });
    const other = s.addCategory('en', 'Other')!;
    expect(s.updateCategory('en', other.id, 'Animals')).toBe('exists');
    expect(s.updateCategory('en', other.id, 'Sports')).toBe('exists');
    expect(s.updateCategory('en', other.id, 'Other 2')).toBe('ok');
  });

  it('merges imported categories that share a name with a built-in one', () => {
    const a = fresh();
    const file = JSON.stringify({
      schema: 1,
      custom: true,
      lang: 'en',
      categories: [{ id: 'c-abc', name: 'Animals', words: { 1: ['okapi'], 2: [], 3: [] } }],
    });
    expect(a.importJson('en', file)).toEqual({ ok: true, added: 1, merged: 1 });
    expect(a.of('en').categories).toEqual([]);
    expect(a.wordsOf('en', 'animals', 1)).toEqual(['okapi']);
  });

  it('restores words of a removed built-in category on load', () => {
    saveJson('pantomime:custom', {
      en: { extra: { gone: { 1: ['x'], 2: [], 3: [] } }, extraNames: { gone: 'Gone' } },
    });
    const s = fresh();
    expect(s.of('en').categories.map((c) => c.name)).toEqual(['Gone']);
    expect(s.of('en').extra).toEqual({});
  });
});
