import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_SETTINGS as d } from '@/config/defaults';
import {
  canSkip,
  rerollDelta,
  scoreMultiTurn,
  scoreSingleSuccess,
  singleTimer,
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

  it('gives the steal to the next team in order, wrapping around', () => {
    expect(stealTeam(0, 2, d.single)).toBe(1);
    expect(stealTeam(2, 3, d.single)).toBe(0);
    expect(stealTeam(0, 3, { ...d.single, steal: false })).toBeNull();
  });
});
