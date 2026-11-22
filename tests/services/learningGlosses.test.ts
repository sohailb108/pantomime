import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';
import { hintFor } from '@/services/words';
import type { Content } from '@/game/types';

const a1: Content = { lang: 'de', kind: 'learning', levels: ['a1'] };

// Uses the real German A1 and A2 packs.
beforeEach(() => setActivePinia(createPinia()));

it('translates German A1 animals into English and Persian', () => {
  expect(hintFor(a1, 'animals', 'der Hund', 'en')).toBe('dog');
  expect(hintFor(a1, 'animals', 'die Schlange', 'en')).toBe('snake / queue');
  expect(hintFor(a1, 'animals', 'der Hund', 'fa')).toBe('سگ');
  expect(hintFor(a1, 'animals', 'die Fliege', 'fa')).toBe('مگس، پاپیون');
});

it('translates other German A1 categories', () => {
  expect(hintFor(a1, 'food', 'das Brot', 'en')).toBe('bread');
  expect(hintFor(a1, 'jobs', 'der Arzt', 'fa')).toBe('پزشک');
});

it('translates German A2 words and has no hint for an unknown word', () => {
  const a2: Content = { lang: 'de', kind: 'learning', levels: ['a2'] };
  expect(hintFor(a2, 'food', 'der Joghurt', 'en')).toBe('yoghurt');
  expect(hintFor(a2, 'food', 'Unbekannt', 'en')).toBeNull();
});
