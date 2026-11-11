import { describe, expect, it } from 'vitest';
import { seededRng } from '@/game/rng';
import { buildDeck, isPoolExhausted } from '@/game/words';

describe('buildDeck', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];

  it('contains every word once', () => {
    expect([...buildDeck(pool, new Set(), seededRng(1))].sort()).toEqual(pool);
  });

  it('ignores duplicate words in the pool', () => {
    expect(buildDeck(['a', 'a', 'b'], new Set(), seededRng(1))).toHaveLength(2);
  });

  it('puts unseen words before seen ones', () => {
    const deck = buildDeck(pool, new Set(['a', 'b']), seededRng(7));
    expect(new Set(deck.slice(0, 3))).toEqual(new Set(['c', 'd', 'e']));
    expect(new Set(deck.slice(3))).toEqual(new Set(['a', 'b']));
  });

  it('is deterministic for a seed', () => {
    expect(buildDeck(pool, new Set(), seededRng(9))).toEqual(
      buildDeck(pool, new Set(), seededRng(9)),
    );
  });

  it('handles an empty pool', () => {
    expect(buildDeck([], new Set(), seededRng(1))).toEqual([]);
  });
});

describe('isPoolExhausted', () => {
  it('is true only when every word was seen', () => {
    expect(isPoolExhausted(['a', 'b'], new Set(['a']))).toBe(false);
    expect(isPoolExhausted(['a', 'b'], new Set(['a', 'b', 'x']))).toBe(true);
    expect(isPoolExhausted([], new Set())).toBe(false);
  });
});
