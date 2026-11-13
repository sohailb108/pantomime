import { buildBoard, MAX_TEAMS, MIN_TEAMS } from './board';
import { buildGoldQueue } from './gold';
import type { GameState, Mode, Rng, ScoreDelta, Settings } from './types';

export interface NewGameOptions {
  /** One color id per team, in turn order. */
  teamColors: readonly string[];
  categoryIds: readonly string[];
  mode: Mode;
  settings: Settings;
  rng: Rng;
  /** Team that goes first. Random when left out. */
  starter?: number;
}

/** Creates a game with a trimmed board. A random team starts unless `starter` is given. */
export function createGame(options: NewGameOptions): GameState {
  const { teamColors, categoryIds, mode, settings, rng } = options;
  if (teamColors.length < MIN_TEAMS || teamColors.length > MAX_TEAMS) {
    throw new RangeError(`Team count must be between ${MIN_TEAMS} and ${MAX_TEAMS}`);
  }
  const tiles = buildBoard(categoryIds, teamColors.length, rng);
  // After the board, so the board of a seeded game does not depend on who starts.
  const currentTeam =
    options.starter ?? Math.min(teamColors.length - 1, Math.floor(rng() * teamColors.length));
  return {
    teams: teamColors.map((color, id) => ({ id, color, score: 0 })),
    tiles,
    currentTeam,
    starter: currentTeam,
    mode,
    settings,
    goldQueue: [],
    status: 'playing',
    startRevealed: false,
  };
}

function applyDeltas(state: GameState, deltas: readonly ScoreDelta[]): GameState['teams'] {
  return state.teams.map((team) => {
    const total = deltas.filter((d) => d.teamId === team.id).reduce((sum, d) => sum + d.points, 0);
    return total === 0 ? team : { ...team, score: team.score + total };
  });
}

/** Tile indexes that have not been played yet. */
export function remainingTiles(state: GameState): number[] {
  return state.tiles.flatMap((tile, i) => (tile.playedBy === undefined ? [i] : []));
}

/**
 * Completes a normal turn: marks the tile as played by the current team, applies the score deltas
 * (the playing team's points, reroll penalty, a steal for another team and so on), and passes the
 * turn to the next team. After the last tile the gold round starts, or the game ends if the gold
 * round is disabled or nobody is eligible. Returns a new state, the input is not modified.
 */
export function finishTurn(
  state: GameState,
  tileIndex: number,
  deltas: readonly ScoreDelta[],
  rng: Rng,
): GameState {
  if (state.status !== 'playing') throw new Error('The game is not in the normal phase');
  const tile = state.tiles[tileIndex];
  if (!tile) throw new RangeError(`No tile at index ${tileIndex}`);
  if (tile.playedBy !== undefined) throw new Error('Tile already played');

  const own = deltas.filter((d) => d.teamId === state.currentTeam);
  const stolen = deltas.find((d) => d.teamId !== state.currentTeam && d.points > 0);
  const result = {
    playedBy: state.currentTeam,
    points: own.reduce((sum, d) => sum + d.points, 0),
    ...(stolen ? { stolenBy: stolen.teamId, stolenPoints: stolen.points } : {}),
  };
  const tiles = state.tiles.map((t, i) => (i === tileIndex ? { ...t, ...result } : t));
  const next: GameState = {
    ...state,
    tiles,
    teams: applyDeltas(state, deltas),
    currentTeam: (state.currentTeam + 1) % state.teams.length,
  };
  if (remainingTiles(next).length > 0) return next;

  const goldQueue = next.settings.gold.enabled ? buildGoldQueue(next.teams, rng) : [];
  return goldQueue.length > 0
    ? { ...next, status: 'gold', goldQueue }
    : { ...next, status: 'finished', goldQueue: [] };
}

/** The team whose gold attempt is next, if the gold round is running. */
export function goldTeam(state: GameState): number | undefined {
  return state.status === 'gold' ? state.goldQueue[0] : undefined;
}

/**
 * The current gold team keeps its points and does not attempt. Nothing changes in the scores, the
 * team leaves the queue and the next one is offered the attempt. The game ends when the queue is empty.
 */
export function declineGoldAttempt(state: GameState): GameState {
  if (goldTeam(state) === undefined) throw new Error('The game is not in the gold round');
  const goldQueue = state.goldQueue.slice(1);
  return { ...state, goldQueue, status: goldQueue.length > 0 ? 'gold' : 'finished' };
}

/**
 * Resolves the current gold attempt. Success adds the bonus and ends the game at once, so teams
 * that have not attempted do not play. Failure deducts the penalty (scores may go below zero) and
 * the next eligible team goes. The game ends when the queue is empty.
 */
export function resolveGoldAttempt(state: GameState, success: boolean): GameState {
  const teamId = goldTeam(state);
  if (teamId === undefined) throw new Error('The game is not in the gold round');
  const { bonus, penalty } = state.settings.gold;
  const teams = applyDeltas(state, [{ teamId, points: success ? bonus : -penalty }]);
  const goldQueue = success ? [] : state.goldQueue.slice(1);
  return { ...state, teams, goldQueue, status: goldQueue.length > 0 ? 'gold' : 'finished' };
}
