import type { Settings } from '@/game/types';

/** Default game settings. Also quoted by the Help page, so keep them as the single source of truth. */
export const DEFAULT_GAME_SETTINGS: Settings = {
  points: { 1: 2, 2: 4, 3: 6 },
  multi: {
    turnSeconds: 60,
    skipLimit: 3,
    skipPenalty: 1,
    lastSecondBonus: true,
  },
  single: {
    timerSeconds: { 1: 30, 2: 60, 3: 90 },
    steal: true,
    stealHalf: false,
    rerollPenalty: 1,
    fastGuessSeconds: 10,
    fastGuessBonus: 1,
  },
  gold: {
    enabled: true,
    bonus: 20,
    penalty: 20,
    timerSeconds: 90,
  },
};
