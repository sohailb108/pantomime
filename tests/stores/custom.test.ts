import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useCustomStore } from '@/stores/custom';
import { saveJson } from '@/services/storage';
import { listCategories } from '@/services/packs';
import { builtinWords, getGoldPool, getPool, hidePoolWord, restorePoolWord } from '@/services/words';

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
    expect(getPool('en', 'animals', 1)).not.toContain('quokka');
    s.addWord('en', 'animals', 1, 'quokka');
    expect(getPool('en', 'animals', 1)).toContain('quokka');
    s.removeWord('en', 'animals', 1, 'quokka');
    expect(getPool('en', 'animals', 1)).not.toContain('quokka');
    s.addGold('en', 'numbat');
    expect(getGoldPool('en')).toContain('numbat');
  });

  it('offers a custom category for games only when complete', () => {
    const s = fresh();
    const id = s.addCategory('en', 'Sports')!.id;
    s.addWord('en', id, 1, 'a');
    s.addWord('en', id, 2, 'b');
    expect(listCategories('en').some((c) => c.id === id)).toBe(false);
    s.addWord('en', id, 3, 'c');
    expect(listCategories('en').some((c) => c.id === id)).toBe(true);
    s.removeCategory('en', id);
    expect(listCategories('en').some((c) => c.id === id)).toBe(false);
  });

  it('does not offer a built-in category whose words are all hidden', () => {
    const s = fresh();
    expect(listCategories('en').some((c) => c.id === 'animals')).toBe(true);
    // A crafted import can hide every word of a pool, which the UI itself refuses to do.
    for (const w of builtinWords('en', 'animals', 1)) s.hideWord('en', 'animals', 1, w);
    expect(getPool('en', 'animals', 1)).toEqual([]);
    expect(listCategories('en').some((c) => c.id === 'animals')).toBe(false);
  });

  it('imports into the right language only', () => {
    const a = fresh();
    a.addGold('en', 'numbat');
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
    const all = getPool('en', 'food', 1);
    expect(all.length).toBeGreaterThan(1);
    const word = all[0]!;
    s.hideWord('en', 'food', 1, word);
    expect(getPool('en', 'food', 1)).not.toContain(word);
    await nextTick();
    expect(fresh().hiddenOf('en', 'food', 1)).toEqual([word]);
    s.unhideWord('en', 'food', 1, word);
    expect(getPool('en', 'food', 1)).toContain(word);
  });

  it('can hide the last word, which takes the category out of new games', () => {
    fresh();
    for (const w of getPool('en', 'food', 1)) hidePoolWord('en', 'food', 1, w);
    expect(getPool('en', 'food', 1)).toHaveLength(0);
    expect(listCategories('en').some((c) => c.id === 'food')).toBe(false);
  });

  it('removes a custom word when hiding it, and restores it', () => {
    const s = fresh();
    s.addWord('en', 'food', 1, 'zzcustom');
    const was = hidePoolWord('en', 'food', 1, 'zzcustom');
    expect(was).toEqual({ builtin: false, custom: true });
    expect(getPool('en', 'food', 1)).not.toContain('zzcustom');
    restorePoolWord('en', 'food', 1, 'zzcustom', was);
    expect(getPool('en', 'food', 1)).toContain('zzcustom');
  });

  it('fills the new fields for data saved before hiding existed', () => {
    localStorage.setItem(
      'pantomime:custom',
      JSON.stringify({ version: 1, data: { en: { categories: [], extra: {}, gold: ['x'] } } }),
    );
    const s = fresh();
    expect(s.hiddenOf('en', 'food', 1)).toEqual([]);
    expect(s.hiddenGold('en')).toEqual([]);
    expect(s.goldWords('en')).toEqual(['x']);
  });

  it('exports, imports and merges hidden words', () => {
    const a = fresh();
    a.hideWord('en', 'food', 1, 'pizza');
    a.hideGold('en', 'g');
    const text = a.exportJson('en');
    setActivePinia(createPinia());
    const b = useCustomStore();
    expect(b.importJson('en', text).ok).toBe(true);
    expect(b.hiddenOf('en', 'food', 1)).toEqual(['pizza']);
    expect(b.hiddenGold('en')).toEqual(['g']);
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
