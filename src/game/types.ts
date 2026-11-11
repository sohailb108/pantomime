export type Difficulty = 1 | 2 | 3;
export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

/** Random source returning a float in [0, 1), like Math.random. Injectable so tests are deterministic. */
export type Rng = () => number;

export type Mode = 'multi' | 'single';

export interface MultiSettings {
  turnSeconds: number;
  /** null means unlimited. */
  skipLimit: number | null;
  /** Points lost per skip, 0 means free. */
  skipPenalty: number;
  /** When time ends, the actor may still finish the current word. */
  lastSecondBonus: boolean;
}

export interface SingleSettings {
  timerSeconds: Record<Difficulty, number>;
  steal: boolean;
  /** Points lost for the one allowed reroll, 0 means free. */
  rerollPenalty: number;
  /** A correct guess within this many seconds earns fastGuessBonus. */
  fastGuessSeconds: number;
  fastGuessBonus: number;
}

export interface GoldSettings {
  enabled: boolean;
  bonus: number;
  penalty: number;
}

export interface Settings {
  /** Points a tile is worth, per difficulty (easy, medium, hard). */
  points: Record<Difficulty, number>;
  multi: MultiSettings;
  single: SingleSettings;
  gold: GoldSettings;
}

export interface Team {
  id: number;
  /** Palette color id, see config/teamColors.ts. The color is what identifies the team. */
  color: string;
  score: number;
}

export interface Tile {
  categoryId: string;
  difficulty: Difficulty;
  /** Id of the team that played the tile. */
  playedBy?: number;
  /** Net points the playing team got from the turn (bonus, skips and reroll included). */
  points?: number;
  /** Id of the team that stole the tile's points, if one did. */
  stolenBy?: number;
}

export type GameStatus = 'playing' | 'gold' | 'finished';

export interface GameState {
  teams: Team[];
  tiles: Tile[];
  currentTeam: number;
  mode: Mode;
  settings: Settings;
  /** Eligible team ids during the gold round, lowest score first, consumed as attempts finish. */
  goldQueue: number[];
  status: GameStatus;
}

/** A score change for one team. Negative values are penalties, scores may go below zero. */
export interface ScoreDelta {
  teamId: number;
  points: number;
}
