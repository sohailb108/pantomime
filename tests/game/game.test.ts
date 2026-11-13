import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import {
  createGame,
  declineGoldAttempt,
  finishTurn,
  goldTeam,
  remainingTiles,
  resolveGoldAttempt,
} from '@/game/game';
import { seededRng } from '@/game/rng';
import type { GameState, Settings } from '@/game/types';

const rng = () => seededRng(42);

function newGame(
  opts: { teams?: string[]; cats?: string[]; settings?: Settings; starter?: number } = {},
) {
  return createGame({
    teamColors: opts.teams ?? ['red', 'blue'],
    categoryIds: opts.cats ?? ['x', 'y'],
    mode: 'multi',
    settings: opts.settings ?? DEFAULT_GAME_SETTINGS,
    rng: rng(),
    starter: opts.starter ?? 0,
  });
}

/** Plays every remaining tile, giving the playing team `points` each turn. */
function playAll(state: GameState, points: (team: number, turn: number) => number): GameState {
  let turn = 0;
  while (state.status === 'playing') {
    const [tile] = remainingTiles(state);
    state = finishTurn(
      state,
      tile!,
      [{ teamId: state.currentTeam, points: points(state.currentTeam, turn++) }],
      rng(),
    );
  }
  return state;
}

describe('createGame', () => {
  it('picks the starting team at random, in range, unless one is given', () => {
    const base = {
      teamColors: ['red', 'blue', 'green'],
      categoryIds: ['x', 'y', 'z'],
      mode: 'multi' as const,
      settings: DEFAULT_GAME_SETTINGS,
    };
    expect(createGame({ ...base, rng: () => 0 }).currentTeam).toBe(0);
    expect(createGame({ ...base, rng: () => 0.5 }).currentTeam).toBe(1);
    expect(createGame({ ...base, rng: () => 0.999999 }).currentTeam).toBe(2);
    expect(createGame({ ...base, rng: () => 0, starter: 2 }).currentTeam).toBe(2);
    expect(createGame({ ...base, rng: () => 0.5 }).starter).toBe(1);
    const seen = new Set<number>();
    for (let seed = 1; seed < 60; seed++) {
      seen.add(createGame({ ...base, rng: seededRng(seed) }).currentTeam);
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('has not shown the first-team card yet', () => {
    expect(newGame().startRevealed).toBe(false);
  });

  it('starts with team 0, zero scores and a trimmed board', () => {
    const g = newGame({ cats: ['x', 'y', 'z'] });
    expect(g.teams.map((t) => t.score)).toEqual([0, 0]);
    expect(g.currentTeam).toBe(0);
    expect(g.tiles).toHaveLength(8);
    expect(g.status).toBe('playing');
  });

  it('rejects an invalid number of teams', () => {
    expect(() => newGame({ teams: ['A'] })).toThrow(RangeError);
  });
});

describe('finishTurn', () => {
  it('marks the tile, applies deltas and alternates teams', () => {
    const g = newGame();
    const g2 = finishTurn(g, 0, [{ teamId: 0, points: 3 }], rng());
    expect(g2.tiles[0]!.playedBy).toBe(0);
    expect(g2.teams[0]!.score).toBe(3);
    expect(g2.currentTeam).toBe(1);
    expect(g2.status).toBe('playing');
    expect(g.teams[0]!.score).toBe(0); // input untouched
    expect(g.tiles[0]!.playedBy).toBeUndefined();
  });

  it('records the net points of the playing team and who stole the tile', () => {
    const g2 = finishTurn(
      newGame(),
      0,
      [
        { teamId: 0, points: -1 },
        { teamId: 1, points: 2 },
      ],
      rng(),
    );
    expect(g2.tiles[0]).toMatchObject({ playedBy: 0, points: -1, stolenBy: 1 });
    const g3 = finishTurn(newGame(), 1, [{ teamId: 0, points: 3 }], rng());
    expect(g3.tiles[1]!.points).toBe(3);
    expect(g3.tiles[1]!.stolenBy).toBeUndefined();
  });

  it('sums several deltas, including a steal and penalties below zero', () => {
    const g = finishTurn(
      newGame(),
      0,
      [
        { teamId: 0, points: -1 },
        { teamId: 0, points: -1 },
        { teamId: 1, points: 2 },
      ],
      rng(),
    );
    expect(g.teams.map((t) => t.score)).toEqual([-2, 2]);
  });

  it('wraps the turn order across 3 teams', () => {
    let g = newGame({ teams: ['A', 'B', 'C'], cats: ['x'] });
    const order: number[] = [];
    while (g.status === 'playing') {
      order.push(g.currentTeam);
      g = finishTurn(g, remainingTiles(g)[0]!, [], rng());
    }
    expect(order).toEqual([0, 1, 2]);
  });

  it('rejects replaying a tile, a bad index or a wrong phase', () => {
    const g = finishTurn(newGame(), 0, [], rng());
    expect(() => finishTurn(g, 0, [], rng())).toThrow('already played');
    expect(() => finishTurn(g, 99, [], rng())).toThrow(RangeError);
    const done = playAll(newGame({ settings: noGold() }), () => 0);
    expect(() => finishTurn(done, 0, [], rng())).toThrow();
  });

  it('gives every team the same number of turns', () => {
    const g = playAll(newGame({ cats: ['x', 'y', 'z'], settings: noGold() }), () => 1);
    const turns = [0, 1].map((id) => g.tiles.filter((t) => t.playedBy === id).length);
    expect(turns).toEqual([4, 4]);
  });
});

const noGold = (): Settings => ({
  ...DEFAULT_GAME_SETTINGS,
  gold: { ...DEFAULT_GAME_SETTINGS.gold, enabled: false },
});

describe('end of normal play', () => {
  it('goes to the gold round for the non-leading teams', () => {
    const g = playAll(newGame(), (team) => (team === 0 ? 3 : 1));
    expect(g.status).toBe('gold');
    expect(g.goldQueue).toEqual([1]);
    expect(goldTeam(g)).toBe(1);
  });

  it('finishes straight away when gold is disabled', () => {
    const g = playAll(newGame({ settings: noGold() }), () => 1);
    expect(g.status).toBe('finished');
    expect(g.goldQueue).toEqual([]);
  });

  it('gives every team a gold attempt when all teams are tied', () => {
    const g = playAll(newGame(), () => 1);
    expect(g.status).toBe('gold');
    expect([...g.goldQueue].sort()).toEqual(g.teams.map((t) => t.id));
  });
});

describe('gold round', () => {
  const toGold = (teams: string[], scorer: (team: number) => number) =>
    playAll(newGame({ teams, cats: ['x', 'y', 'z'] }), (t) => scorer(t));

  it('a team can decline: scores stay, the next team is offered the attempt', () => {
    const g = toGold(['A', 'B', 'C'], (t) => [5, 2, 1][t]!);
    const after = declineGoldAttempt(g);
    expect(after.teams.map((t) => t.score)).toEqual(g.teams.map((t) => t.score));
    expect(after.goldQueue).toEqual([1]);
    expect(after.status).toBe('gold');
    const done = declineGoldAttempt(after);
    expect(done.status).toBe('finished');
    expect(done.goldQueue).toEqual([]);
    expect(() => declineGoldAttempt(newGame())).toThrow();
  });

  it('success adds the bonus and ends the game at once', () => {
    const g = toGold(['A', 'B', 'C'], (t) => [5, 2, 1][t]!);
    expect(g.goldQueue).toEqual([2, 1]);
    const after = resolveGoldAttempt(g, true);
    expect(after.status).toBe('finished');
    expect(after.goldQueue).toEqual([]);
    expect(after.teams[2]!.score).toBe(g.teams[2]!.score + 20);
  });

  it('failure deducts the penalty and moves to the next team', () => {
    const g = toGold(['A', 'B', 'C'], (t) => [5, 2, 1][t]!);
    const after = resolveGoldAttempt(g, false);
    expect(after.status).toBe('gold');
    expect(goldTeam(after)).toBe(1);
    expect(after.teams[2]!.score).toBe(g.teams[2]!.score - 20);
  });

  it('ends after the last eligible team fails, scores may go below zero', () => {
    let g = toGold(['A', 'B'], (t) => (t === 0 ? 1 : 0));
    g = resolveGoldAttempt(g, false);
    expect(g.status).toBe('finished');
    expect(g.teams[1]!.score).toBe(-20);
  });

  it('lets the comeback team win with the bonus', () => {
    let g = toGold(['A', 'B'], (t) => (t === 0 ? 2 : 1));
    const leaderScore = g.teams[0]!.score;
    g = resolveGoldAttempt(g, true);
    expect(g.teams[1]!.score).toBeGreaterThan(leaderScore);
  });

  it('uses the configured bonus and penalty', () => {
    const settings: Settings = {
      ...DEFAULT_GAME_SETTINGS,
      gold: { enabled: true, bonus: 7, penalty: 0, timerSeconds: 90 },
    };
    const g = playAll(newGame({ settings }), (t) => (t === 0 ? 2 : 1));
    expect(resolveGoldAttempt(g, false).teams[1]!.score).toBe(g.teams[1]!.score);
    expect(resolveGoldAttempt(g, true).teams[1]!.score).toBe(g.teams[1]!.score + 7);
  });

  it('rejects resolving outside the gold round', () => {
    expect(() => resolveGoldAttempt(newGame(), true)).toThrow();
  });
});
