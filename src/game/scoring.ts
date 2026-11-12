import type { Difficulty, MultiSettings, ScoreDelta, SingleSettings } from './types';

/** Whether the actor may skip again in multi-word mode. */
export function canSkip(settings: MultiSettings, skipsSoFar: number): boolean {
  return settings.skipLimit === null || skipsSoFar < settings.skipLimit;
}

export interface MultiTurnTally {
  correct: number;
  skips: number;
}

/** Net points for a multi-word turn: the tile's points per correct word, minus the skip penalty per skip. */
export function scoreMultiTurn(
  points: number,
  tally: MultiTurnTally,
  settings: MultiSettings,
): number {
  return tally.correct * points - tally.skips * settings.skipPenalty;
}

/** Timer length in seconds for a single-word turn. */
export function singleTimer(difficulty: Difficulty, settings: SingleSettings): number {
  return settings.timerSeconds[difficulty];
}

export interface SingleSuccessScore {
  base: number;
  bonus: number;
  total: number;
}

/** Points for a successful single-word turn: the tile's points, plus the fast-guess bonus if fast enough. */
export function scoreSingleSuccess(
  points: number,
  elapsedSeconds: number,
  settings: SingleSettings,
): SingleSuccessScore {
  const bonus = elapsedSeconds <= settings.fastGuessSeconds ? settings.fastGuessBonus : 0;
  return { base: points, bonus, total: points + bonus };
}

/** The reroll penalty as a delta for the team that rerolled (nothing when it is free). */
export function rerollDelta(teamId: number, settings: SingleSettings): ScoreDelta[] {
  return settings.rerollPenalty > 0 ? [{ teamId, points: -settings.rerollPenalty }] : [];
}

/** Steal is only fair with two teams: with more, just one of the others would get the chance. */
export const canSteal = (teamCount: number): boolean => teamCount === 2;

/** The team that gets the steal guess: the other team. Null if steal is disabled or not allowed. */
export function stealTeam(
  currentTeam: number,
  teamCount: number,
  settings: SingleSettings,
): number | null {
  return settings.steal && canSteal(teamCount) ? (currentTeam + 1) % teamCount : null;
}
