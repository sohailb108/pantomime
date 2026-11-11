import { describe, expect, it } from 'vitest';
import { buildBoard, buildTiles, minCategoriesFor, trimTiles } from '@/game/board';
import { seededRng } from '@/game/rng';

const count = (tiles: { difficulty: number }[], d: number) =>
  tiles.filter((t) => t.difficulty === d).length;

describe('buildTiles', () => {
  it('makes 3 tiles per category', () => {
    const tiles = buildTiles(['a', 'b']);
    expect(tiles).toHaveLength(6);
    expect(tiles.filter((t) => t.categoryId === 'a').map((t) => t.difficulty)).toEqual([1, 2, 3]);
  });
});

describe('trimTiles', () => {
  it('keeps the board when already a multiple of the team count', () => {
    expect(trimTiles(buildTiles(['a', 'b']), 2, seededRng(1))).toHaveLength(6);
    expect(trimTiles(buildTiles(['a']), 3, seededRng(1))).toHaveLength(3);
  });

  it('removes one easy tile for 3 categories and 2 teams (9 -> 8)', () => {
    const tiles = trimTiles(buildTiles(['a', 'b', 'c']), 2, seededRng(1));
    expect(tiles).toHaveLength(8);
    expect(count(tiles, 1)).toBe(2);
    expect(count(tiles, 2)).toBe(3);
    expect(count(tiles, 3)).toBe(3);
  });

  it('removes several easy tiles when needed (5 categories, 4 teams: 15 -> 12)', () => {
    const tiles = trimTiles(buildTiles(['a', 'b', 'c', 'd', 'e']), 4, seededRng(2));
    expect(tiles).toHaveLength(12);
    expect(count(tiles, 1)).toBe(2);
  });

  it('falls back to the lowest remaining difficulty when easy tiles run out', () => {
    // 2 categories (6 tiles), 5 teams: 6 % 5 = 1 -> remove one easy tile. 1 category, 2 teams:
    // 3 % 2 = 1 -> one easy tile. Force the fallback with a hand-made board of medium and hard.
    const tiles = [
      { categoryId: 'a', difficulty: 2 as const },
      { categoryId: 'b', difficulty: 2 as const },
      { categoryId: 'c', difficulty: 3 as const },
    ];
    const out = trimTiles(tiles, 2, seededRng(3));
    expect(out).toHaveLength(2);
    expect(count(out, 3)).toBe(1);
  });

  it('always yields a multiple of the team count and only trims the lowest tiles', () => {
    for (let teams = 2; teams <= 6; teams++) {
      for (let cats = minCategoriesFor(teams); cats <= 8; cats++) {
        const ids = Array.from({ length: cats }, (_, i) => `c${i}`);
        const tiles = buildBoard(ids, teams, seededRng(cats * 10 + teams));
        expect(tiles.length % teams).toBe(0);
        expect(tiles.length).toBeGreaterThanOrEqual(teams);
        expect(count(tiles, 3)).toBe(cats);
      }
    }
  });

  it('does not modify its input', () => {
    const tiles = buildTiles(['a', 'b', 'c']);
    trimTiles(tiles, 2, seededRng(1));
    expect(tiles).toHaveLength(9);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const ids = ['a', 'b', 'c'];
    const run = (seed: number) => JSON.stringify(buildBoard(ids, 2, seededRng(seed)));
    expect(run(5)).toBe(run(5));
    const results = new Set(Array.from({ length: 20 }, (_, s) => run(s)));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('buildBoard validation', () => {
  it('rejects bad team counts', () => {
    expect(() => buildBoard(['a', 'b'], 1, seededRng(1))).toThrow(RangeError);
    expect(() => buildBoard(['a', 'b'], 7, seededRng(1))).toThrow(RangeError);
  });

  it('rejects too few categories for the team count', () => {
    expect(minCategoriesFor(2)).toBe(1);
    expect(minCategoriesFor(4)).toBe(2);
    expect(minCategoriesFor(6)).toBe(2);
    expect(() => buildBoard(['a'], 4, seededRng(1))).toThrow(RangeError);
    expect(buildBoard(['a'], 3, seededRng(1))).toHaveLength(3);
  });

  it('rejects duplicate categories', () => {
    expect(() => buildBoard(['a', 'a'], 2, seededRng(1))).toThrow();
  });
});
