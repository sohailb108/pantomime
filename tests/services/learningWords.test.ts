import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalContent } from '@/game/content';
import type * as learningPacks from '@/services/learningPacks';
import type { Content } from '@/game/types';
import { categoryWordCount, listAllCategories, listCategories } from '@/services/packs';
import { useCustomStore } from '@/stores/custom';
import { useLearningStore } from '@/stores/learning';
import {
  builtinWords,
  changePoolWord,
  getGoldPool,
  getPool,
  hintFor,
  nativeLevel,
  placementIn,
  revertPoolChange,
} from '@/services/words';

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

  it('finds native difficulty over the levels', () => {
    expect(nativeLevel(learn('a1', 'a2'), 'food', 'Nudel')).toBe(2);
    expect(nativeLevel(learn('a1'), 'food', 'Nudel')).toBeNull();
  });

  it('hints with the translation into the app language, as written in the pack', () => {
    expect(hintFor(learn('a1'), 'food', 'Brot', 'en')).toBe('bread');
    expect(hintFor(learn('a1'), 'food', 'brot', 'en')).toBe('bread');
    expect(hintFor(learn('a1'), 'food', 'Gabel', 'en')).toBe('fork / pitchfork');
    expect(hintFor(learn('a1'), 'food', 'Brot', 'fa')).toBe('نان');
  });

  it('finds a translation at the level that has it', () => {
    expect(hintFor(learn('a1'), 'food', 'Käse', 'en')).toBeNull();
    expect(hintFor(learn('a1', 'a2'), 'food', 'Käse', 'en')).toBe('cheese');
  });

  it('has no hint for a word without a translation in the app language', () => {
    expect(hintFor(learn('a1'), 'food', 'Apfel', 'en')).toBeNull();
    expect(hintFor(learn('a1'), 'food', 'Gabel', 'fa')).toBeNull();
    expect(hintFor(learn('a1', 'a2'), 'food', 'Nudel', 'en')).toBeNull();
  });

  it('does not fall back to the acting tip when there is no translation', () => {
    expect(hintFor(learn('a1'), 'food', 'Suppe', 'en')).toBeNull();
    expect(hintFor(learn('a1', 'a2'), 'food', 'Käse', 'fa')).toBeNull();
    expect(hintFor(learn('a1'), 'food', 'Suppe')).toBeNull();
  });

  it('has no gold pool', () => {
    expect(getGoldPool(learn('a1'))).toEqual([]);
  });

  describe('hiding and moving', () => {
    it('hides a word at its own level only, in every combination with that level', () => {
      const change = changePoolWord(learn('a1', 'a2'), 'food', 1, 'Brot', 'hidden');
      expect(change).toMatchObject({ pack: 'a1', now: null, before: 'native' });
      expect(getPool(learn('a1'), 'food', 1)).toEqual(['Apfel']);
      // The fixture also has "brot" at A2, which the A1 placement does not touch.
      expect(getPool(learn('a1', 'a2'), 'food', 1)).toEqual(['Apfel', 'Käse', 'brot']);
      expect(getPool(learn('a2'), 'food', 1)).toEqual(['Käse', 'brot']);
    });

    it('moves a word to another difficulty and back', () => {
      const change = changePoolWord(learn('a1'), 'food', 1, 'Apfel', 2)!;
      expect(change.now).toBe(2);
      expect(getPool(learn('a1'), 'food', 2)).toEqual(['Apfel', 'Suppe']);
      expect(placementIn(learn('a1', 'a2'), 'food', 'Apfel')).toBe(2);
      expect(changePoolWord(learn('a1'), 'food', 2, 'Apfel', 'native')?.now).toBe(1);
      expect(getPool(learn('a1'), 'food', 1)).toEqual(['Brot', 'Apfel']);
    });

    it('takes a change back', () => {
      const change = changePoolWord(learn('a1'), 'food', 1, 'Brot', 'hidden')!;
      revertPoolChange(change);
      expect(getPool(learn('a1'), 'food', 1)).toEqual(['Brot', 'Apfel']);
    });

    it('refuses a word that is not in the pool, or a move to where it is', () => {
      expect(changePoolWord(learn('a1'), 'food', 1, 'Käse', 'hidden')).toBeNull();
      expect(changePoolWord(learn('a1'), 'food', 1, 'Brot', 1)).toBeNull();
      expect(changePoolWord(learn('a1'), 'food', 1, 'Brot', 'native')).toBeNull();
    });

    it('keeps placements in their own storage, apart from normal packs', () => {
      changePoolWord(learn('a1'), 'food', 1, 'Brot', 'hidden');
      expect(useCustomStore().placementOf('de', 'food', 'Brot')).toBe('native');
      expect(useLearningStore().hiddenOf('de', 'a1', 'food')).toEqual(['Brot']);
      expect(useLearningStore().hiddenOf('de', 'a2', 'food')).toEqual([]);
    });
  });

  it('leaves normal content alone', () => {
    expect(getPool(normalContent('de'), 'food', 1).length).toBeGreaterThan(0);
    expect(getGoldPool(normalContent('de')).length).toBeGreaterThan(0);
  });
});
