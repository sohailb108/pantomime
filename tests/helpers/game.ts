import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import type { Mode, ScoreDelta } from '@/game/types';
import { useGameStore } from '@/stores/game';

/** Starts a two-team game on the first categories, with the first-team card already dismissed. */
export function startGame(options: { mode?: Mode; categories?: string[]; teams?: string[]; gold?: boolean } = {}) {
  const game = useGameStore();
  const settings = structuredClone(DEFAULT_GAME_SETTINGS);
  settings.gold.enabled = options.gold ?? true;
  game.start({
    teamColors: options.teams ?? ['red', 'blue'],
    categoryIds: options.categories ?? ['animals', 'movies'],
    mode: options.mode ?? 'multi',
    settings,
    lang: 'en',
  });
  game.revealStart();
  return game;
}

/** Plays tiles in order, giving each the same points, until `count` tiles are played. */
export function playTiles(game: ReturnType<typeof useGameStore>, count: number, delta = 2) {
  for (let i = 0; i < count; i++) {
    const index = game.state!.tiles.findIndex((t) => t.playedBy === undefined);
    game.pick(index);
    const team = game.state!.currentTeam;
    game.finish([{ teamId: team, points: delta } satisfies ScoreDelta]);
  }
}

/** Plays every tile, leaving the game in the gold round (or finished when gold is off). */
export function playAllTiles(game: ReturnType<typeof useGameStore>) {
  playTiles(game, game.state!.tiles.length);
}

