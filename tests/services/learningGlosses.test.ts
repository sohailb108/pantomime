import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';
import { hintFor } from '@/services/words';
import type { Content } from '@/game/types';

const a1: Content = { lang: 'de', kind: 'learning', levels: ['a1'] };

// Uses the real German A1 Animals pack.
beforeEach(() => setActivePinia(createPinia()));

it('translates German A1 animals into English and Persian', () => {
  expect(hintFor(a1, 'animals', 'Hund', 'en')).toBe('dog');
  expect(hintFor(a1, 'animals', 'Schlange', 'en')).toBe('snake / queue');
  expect(hintFor(a1, 'animals', 'Hund', 'fa')).toBe('سگ');
  expect(hintFor(a1, 'animals', 'Fliege', 'fa')).toBe('مگس، پاپیون');
});

it('has no hint for a category without translations yet', () => {
  expect(hintFor(a1, 'food', 'Brot', 'en')).toBeNull();
});
