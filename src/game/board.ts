import { shuffle } from './rng';
import { DIFFICULTIES, type Rng, type Tile } from './types';

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

/** Fewest categories that leave every team at least one tile after trimming (3 tiles per category). */
export function minCategoriesFor(teamCount: number): number {
  return Math.ceil(teamCount / DIFFICULTIES.length);
}

/** One tile per category and difficulty, before trimming. */
export function buildTiles(categoryIds: readonly string[]): Tile[] {
  return categoryIds.flatMap((categoryId) =>
    DIFFICULTIES.map((difficulty): Tile => ({ categoryId, difficulty })),
  );
}

/**
 * Removes random difficulty-1 tiles until the count is a multiple of the team count, so every team
 * gets the same number of turns. If there are not enough easy tiles, falls back to random tiles of
 * the lowest difficulty remaining. The gold round is not a tile and is not part of this.
 */
export function trimTiles(tiles: readonly Tile[], teamCount: number, rng: Rng): Tile[] {
  const remaining = [...tiles];
  let toRemove = remaining.length % teamCount;
  while (toRemove > 0) {
    const lowest = Math.min(...remaining.map((t) => t.difficulty));
    const candidates = remaining
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile }) => tile.difficulty === lowest);
    const [pick] = shuffle(candidates, rng);
    remaining.splice(pick!.index, 1);
    toRemove--;
  }
  return remaining;
}

/** Builds the trimmed board for the chosen categories. Throws if there are too few categories. */
export function buildBoard(categoryIds: readonly string[], teamCount: number, rng: Rng): Tile[] {
  if (teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
    throw new RangeError(`Team count must be between ${MIN_TEAMS} and ${MAX_TEAMS}`);
  }
  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new Error('Duplicate category ids');
  }
  if (categoryIds.length < minCategoriesFor(teamCount)) {
    throw new RangeError(
      `${teamCount} teams need at least ${minCategoriesFor(teamCount)} categories`,
    );
  }
  return trimTiles(buildTiles(categoryIds), teamCount, rng);
}
