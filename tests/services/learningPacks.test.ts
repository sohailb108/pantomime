import { describe, expect, it } from 'vitest';
import { createLearningPacks } from '@/services/learningPacks';
import { learningFiles, learningIndexes } from '../fixtures/learning';

const lp = createLearningPacks(learningFiles, learningIndexes);

describe('learning packs loader', () => {
  it('knows which languages and levels have learning packs', () => {
    expect(lp.hasLearning('de')).toBe(true);
    expect(lp.hasLearning('en')).toBe(false);
    expect(lp.learningLevels('de')).toEqual(['a1', 'a2']);
    expect(lp.learningLevels('en')).toEqual([]);
  });

  it('lists categories that have a file at one of the levels', () => {
    expect(lp.listLearningCategories('de', ['a1']).map((c) => c.id)).toEqual(['food', 'animals']);
    expect(lp.listLearningCategories('de', ['a2']).map((c) => c.id)).toEqual(['food', 'sport']);
    expect(lp.listLearningCategories('de', ['a1', 'a2']).map((c) => c.id)).toEqual(['food', 'animals', 'sport']);
    expect(lp.listLearningCategories('de', ['b1'])).toEqual([]);
  });

  it('merges levels in CEFR order and drops duplicates', () => {
    expect(lp.mergedLearningWords('de', ['a2', 'a1'], 'food', 1)).toEqual(['Brot', 'Apfel', 'Käse']);
    expect(lp.mergedLearningWords('de', ['a2'], 'food', 1)).toEqual(['Käse', 'brot']);
    expect(lp.mergedLearningWords('de', ['a1'], 'sport', 1)).toEqual([]);
  });

  it('finds a hint at the first level that has one', () => {
    expect(lp.learningHint('de', ['a1', 'a2'], 'food', 'brot', 'en')).toBe('bread');
    expect(lp.learningHint('de', ['a1'], 'food', 'Käse', 'en')).toBeNull();
    expect(lp.learningHint('de', ['a1', 'a2'], 'food', 'Käse', 'en')).toBe('cheese');
  });
});
