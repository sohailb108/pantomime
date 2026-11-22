import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalContent } from '@/game/content';
import type * as learningPacks from '@/services/learningPacks';
import type { Content } from '@/game/types';
import { categoryWordCount, listAllCategories, listCategories } from '@/services/packs';
import { builtinWords, changePoolWord, getGoldPool, getPool, hintFor, nativeLevel } from '@/services/words';

vi.mock('@/services/learningPacks', async () => {
  const actual = await vi.importActual<Pick<typeof learningPacks, 'createLearningPacks'>>('@/services/learningPacks');
  const { learningFiles, learningIndexes } = await import('../fixtures/learning');
  return actual.createLearningPacks(learningFiles, learningIndexes);
});

const learn = (...levels: Content['levels']): Content => ({ lang: 'de', kind: 'learning', levels });

describe('learning content', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('builds each pool from the merged levels', () => {
    expect(getPool(learn('a1'), 'food', 1)).toEqual(['Brot', 'Apfel']);
    expect(getPool(learn('a1', 'a2'), 'food', 1)).toEqual(['Brot', 'Apfel', 'Käse']);
    expect(getPool(learn('a1', 'a2'), 'food', 3)).toEqual(['Gabel', 'Messer']);
    expect(builtinWords(learn('a2'), 'food', 2)).toEqual(['Nudel']);
  });

  it('lists only categories with a word at every difficulty in the merged pool', () => {
    expect(listAllCategories(learn('a2')).map((c) => c.id)).toEqual(['food', 'sport']);
    expect(listCategories(learn('a2')).map((c) => c.id)).toEqual(['food']);
    expect(listCategories(learn('a1', 'a2')).map((c) => c.id)).toEqual(['food', 'animals']);
    expect(listCategories(learn('a1')).every((c) => !c.custom)).toBe(true);
  });

  it('counts words over the merged levels', () => {
    expect(categoryWordCount(learn('a1'), 'food')).toBe(4);
    expect(categoryWordCount(learn('a1', 'a2'), 'food')).toBe(7);
  });

  it('finds hints and native difficulty over the levels', () => {
    expect(hintFor(learn('a1'), 'food', 'Suppe')).toBe('Löffel');
    expect(nativeLevel(learn('a1', 'a2'), 'food', 'Nudel')).toBe(2);
    expect(nativeLevel(learn('a1'), 'food', 'Nudel')).toBeNull();
  });

  it('has no gold pool and no hiding yet', () => {
    expect(getGoldPool(learn('a1'))).toEqual([]);
    expect(changePoolWord(learn('a1'), 'food', 1, 'Brot', 'hidden')).toBeNull();
  });

  it('leaves normal content alone', () => {
    expect(getPool(normalContent('de'), 'food', 1).length).toBeGreaterThan(0);
    expect(getGoldPool(normalContent('de')).length).toBeGreaterThan(0);
  });
});
