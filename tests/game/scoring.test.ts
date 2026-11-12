import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_SETTINGS as d } from '@/config/defaults';
import {
  canSkip,
  rerollDelta,
  scoreMultiTurn,
  scoreSingleSuccess,
  singleTimer,
  stealPoints,
  stealTeam,
} from '@/game/scoring';

describe('multi-word scoring', () => {
  it('scores difficulty per correct word minus skip penalties', () => {
    expect(scoreMultiTurn(2, { correct: 3, skips: 0 }, d.multi)).toBe(6);
    expect(scoreMultiTurn(2, { correct: 3, skips: 2 }, d.multi)).toBe(4);
  });

  it('can go negative, and free skips cost nothing', () => {
    expect(scoreMultiTurn(1, { correct: 0, skips: 3 }, d.multi)).toBe(-3);
    expect(scoreMultiTurn(1, { correct: 0, skips: 3 }, { ...d.multi, skipPenalty: 0 })).toBe(0);
  });

  it('enforces the skip limit, null means unlimited', () => {
    const limited = { ...d.multi, skipLimit: 2 };
    expect(canSkip(limited, 1)).toBe(true);
    expect(canSkip(limited, 2)).toBe(false);
    expect(canSkip({ ...d.multi, skipLimit: 0 }, 0)).toBe(false);
    expect(canSkip({ ...d.multi, skipLimit: null }, 999)).toBe(true);
  });
});

describe('single-word scoring', () => {
  it('uses the timer of the difficulty', () => {
    expect(singleTimer(1, d.single)).toBe(30);
    expect(singleTimer(3, d.single)).toBe(90);
  });

  it('adds the fast-guess bonus within the threshold only', () => {
    expect(scoreSingleSuccess(2, 5, d.single)).toEqual({ base: 2, bonus: 1, total: 3 });
    expect(scoreSingleSuccess(2, 10, d.single).bonus).toBe(1);
    expect(scoreSingleSuccess(2, 10.5, d.single)).toEqual({ base: 2, bonus: 0, total: 2 });
  });

  it('reroll is a penalty delta, or nothing when free', () => {
    expect(rerollDelta(1, d.single)).toEqual([{ teamId: 1, points: -1 }]);
    expect(rerollDelta(1, { ...d.single, rerollPenalty: 0 })).toEqual([]);
  });

  it('gives the steal to the other team, and never in games with more than two teams', () => {
    expect(stealTeam(0, 2, d.single)).toBe(1);
    expect(stealTeam(1, 2, d.single)).toBe(0);
    expect(stealTeam(2, 3, d.single)).toBeNull();
    expect(stealTeam(0, 3, { ...d.single, steal: false })).toBeNull();
  });

  it('values a steal at the tile points, or half of them rounded up', () => {
    expect(stealPoints(4, d.single)).toBe(4);
    expect(stealPoints(4, { ...d.single, stealHalf: true })).toBe(2);
    expect(stealPoints(5, { ...d.single, stealHalf: true })).toBe(3);
    expect(stealPoints(1, { ...d.single, stealHalf: true })).toBe(1);
  });
});
