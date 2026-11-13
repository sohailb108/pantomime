import { describe, expect, it } from 'vitest';
import { randInt, seededRng, shuffle } from '@/game/rng';

describe('seededRng', () => {
  it('repeats for the same seed and differs across seeds', () => {
    const a = seededRng(1);
    const b = seededRng(1);
    const seqA = [a(), a(), a()];
    expect(seqA).toEqual([b(), b(), b()]);
    expect(seqA).not.toEqual([seededRng(2)(), seededRng(2)(), seededRng(2)()]);
  });

  it('stays within [0, 1)', () => {
    const r = seededRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt', () => {
  it('stays within [0, max) and reaches every value', () => {
    const r = seededRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randInt(r, 5));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('shuffle', () => {
  it('returns a permutation without touching its input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, seededRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort()).toEqual(input);
  });

  it('is deterministic for a seed and handles tiny lists', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRng(9))).toEqual(shuffle([1, 2, 3, 4, 5], seededRng(9)));
    expect(shuffle([], seededRng(1))).toEqual([]);
    expect(shuffle([1], seededRng(1))).toEqual([1]);
  });

  it('can produce every order of three items', () => {
    const orders = new Set<string>();
    const r = seededRng(5);
    for (let i = 0; i < 200; i++) orders.add(shuffle([1, 2, 3], r).join());
    expect(orders.size).toBe(6);
  });
});
