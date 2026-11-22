import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Content, Difficulty } from '@/game/types';
import { categoryWordCount, listCategories } from '@/services/packs';
import { builtinWords, hintFor } from '@/services/words';

// Uses the real German packs: what a player gets when A1 and A2 are both selected.
const a1: Content = { lang: 'de', kind: 'learning', levels: ['a1'] };
const a2: Content = { lang: 'de', kind: 'learning', levels: ['a2'] };
const both: Content = { lang: 'de', kind: 'learning', levels: ['a1', 'a2'] };
const difficulties: Difficulty[] = [1, 2, 3];

describe('German A1 + A2 together', () => {
  beforeEach(() => setActivePinia(createPinia()));
  const categoryIds = () => listCategories(both).map((c) => c.id);

  it('offers all six categories, each playable at every difficulty', () => {
    const ids = categoryIds();
    expect([...ids].sort()).toEqual(['animals', 'food', 'general', 'jobs', 'objects', 'places']);
    for (const id of ids) {
      for (const d of difficulties) expect(builtinWords(both, id, d).length).toBeGreaterThanOrEqual(10);
    }
  });

  it('merges the two levels without losing or repeating a word', () => {
    const ids = categoryIds();
    for (const id of ids) {
      for (const d of difficulties) {
        const merged = builtinWords(both, id, d);
        expect(new Set(merged).size).toBe(merged.length);
        const separate = [...builtinWords(a1, id, d), ...builtinWords(a2, id, d)];
        expect(merged).toEqual(separate);
      }
      expect(categoryWordCount(both, id)).toBe(categoryWordCount(a1, id) + categoryWordCount(a2, id));
    }
  });

  it('puts the A1 words before the A2 words', () => {
    const food = builtinWords(both, 'food', 1);
    expect(food.indexOf('das Brot')).toBeGreaterThanOrEqual(0);
    expect(food.indexOf('das Brot')).toBeLessThan(builtinWords(a1, 'food', 1).length);
  });

  it('translates every word into English and Persian', () => {
    const ids = categoryIds();
    for (const id of ids) {
      for (const d of difficulties) {
        for (const word of builtinWords(both, id, d)) {
          expect(hintFor(both, id, word, 'en'), `${id}: ${word} (en)`).toBeTruthy();
          expect(hintFor(both, id, word, 'fa'), `${id}: ${word} (fa)`).toBeTruthy();
        }
      }
    }
  });

  it('hints with a word from each level', () => {
    expect(hintFor(both, 'food', 'das Brot', 'en')).toBe('bread');
    expect(hintFor(both, 'food', 'der Joghurt', 'en')).toBe('yoghurt');
  });
});
