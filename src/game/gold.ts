import { shuffle } from './rng';
import { leaders } from './ranking';
import type { Rng, Team } from './types';

/**
 * Teams that get a gold attempt, lowest score first, ties broken randomly. Scores are read once, at
 * the start of the gold round. A single leader is excluded; when several teams tie for first, the
 * tie is a chance to break it, so every tied team gets an attempt too (if all teams are tied,
 * everyone plays).
 */
export function buildGoldQueue(teams: readonly Team[], rng: Rng): number[] {
  const top = leaders(teams);
  const soleLeader = top.length === 1 ? top[0]!.id : undefined;
  const eligible = shuffle(
    teams.filter((t) => t.id !== soleLeader),
    rng,
  );
  // Array.prototype.sort is stable, so the shuffle above decides the order of equal scores.
  return eligible.sort((a, b) => a.score - b.score).map((t) => t.id);
}
