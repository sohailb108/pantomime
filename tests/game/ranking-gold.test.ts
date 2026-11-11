import { describe, expect, it } from 'vitest';
import { buildGoldQueue } from '@/game/gold';
import { leaders, rankTeams } from '@/game/ranking';
import { seededRng } from '@/game/rng';
import type { Team } from '@/game/types';

const teams = (...scores: number[]): Team[] =>
  scores.map((score, id) => ({ id, color: `c${id}`, score }));

describe('rankTeams', () => {
  it('sorts by score descending', () => {
    expect(rankTeams(teams(3, 9, 5)).map((r) => [r.teamId, r.rank])).toEqual([
      [1, 1],
      [2, 2],
      [0, 3],
    ]);
  });

  it('shows ties as ties and skips the next rank', () => {
    expect(rankTeams(teams(5, 5, 2, 7)).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it('supports negative scores', () => {
    expect(rankTeams(teams(-3, 0)).map((r) => r.teamId)).toEqual([1, 0]);
  });
});

describe('leaders', () => {
  it('returns all teams sharing the top score', () => {
    expect(leaders(teams(5, 9, 9)).map((t) => t.id)).toEqual([1, 2]);
  });
});

describe('buildGoldQueue', () => {
  it('excludes the leader and orders lowest score first', () => {
    expect(buildGoldQueue(teams(10, 2, 6), seededRng(1))).toEqual([1, 2]);
  });

  it('includes every team tied for the lead', () => {
    const q = buildGoldQueue(teams(10, 10, 3), seededRng(1));
    expect(q[0]).toBe(2);
    expect([...q].sort()).toEqual([0, 1, 2]);
  });

  it('includes everyone when all teams are tied', () => {
    expect([...buildGoldQueue(teams(4, 4, 4), seededRng(1))].sort()).toEqual([0, 1, 2]);
  });

  it('works with negative scores', () => {
    expect(buildGoldQueue(teams(-5, 0, -9), seededRng(1))).toEqual([2, 0]);
  });

  it('breaks ties among eligible teams randomly but keeps score order', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const q = buildGoldQueue(teams(1, 1, 8, 5), seededRng(seed));
      expect(q.at(-1)).toBe(3);
      orders.add(q.join());
    }
    expect(orders).toEqual(new Set(['0,1,3', '1,0,3']));
  });
});
