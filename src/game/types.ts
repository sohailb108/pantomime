export type Difficulty = 1 | 2 | 3;
export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

/** Random source returning a float in [0, 1), like Math.random. Injectable so tests are deterministic. */
export type Rng = () => number;

export type Mode = 'multi' | 'single';

export type PackKind = 'normal' | 'learning';
export type Level = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';

/** What a game's words come from: the word language and, for learning packs, the CEFR levels. */
export interface Content {
  /** Word language: 'de', 'en', 'fa'. */
  lang: string;
  kind: PackKind;
  /** Empty for normal packs, at least one for learning packs. */
  levels: Level[];
}

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
  /** A correct steal is worth half the tile's points (rounded up) instead of all of them. */
  stealHalf: boolean;
  /** Points lost for the one allowed reroll, 0 means free. */
  rerollPenalty: number;
  /** After swapping the word, the actor may change back to the original (the penalty stays). */
  allowRevert: boolean;
  /** The actor may ask for one acting hint per turn. */
  hint: boolean;
  /** Points lost for the one acting hint of a turn, 0 means free. */
  hintPenalty: number;
  /** The hint costs half of the tile points (rounded up) instead of `hintPenalty`. */
  hintHalf: boolean;
  /** A correct guess within this many seconds earns fastGuessBonus. */
  fastGuessSeconds: number;
  fastGuessBonus: number;
}

export interface GoldSettings {
  enabled: boolean;
  bonus: number;
  penalty: number;
  /** Length of a gold attempt in seconds. */
  timerSeconds: number;
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
  /** Points the stealing team got. */
  stolenPoints?: number;
}

/** How one team's gold attempt went. */
export interface GoldAttempt {
  teamId: number;
  outcome: 'success' | 'failure' | 'declined';
  /** Score change from the attempt: the bonus, minus the penalty, or 0 when declined. */
  points: number;
}

/**
 * How a word of a turn ended: guessed, skipped (multi-word), not guessed, guessed by the stealing team,
 * on screen when the time ran out or the turn was ended, or swapped away by the reroll.
 */
export type WordOutcome = 'guessed' | 'skipped' | 'failed' | 'stolen' | 'unanswered' | 'rerolled';

/** A word shown during one turn, as the Turn page reports it. */
export interface TurnWord {
  word: string;
  outcome: WordOutcome;
  /** The actor took the hint (the translation in Learning games) on this word. */
  hinted: boolean;
}

/** A word shown during the game, kept for the review screen (Learning games only). */
export interface PlayedWord extends TurnWord {
  categoryId: string;
  difficulty: Difficulty;
  /** The team that acted it. */
  teamId: number;
}

export type GameStatus = 'playing' | 'gold' | 'finished';

export interface GameState {
  teams: Team[];
  tiles: Tile[];
  currentTeam: number;
  /** Team that went first; the turn order starts here and wraps around. */
  starter: number;
  mode: Mode;
  settings: Settings;
  /** Eligible team ids during the gold round, lowest score first, consumed as attempts finish. */
  goldQueue: number[];
  /** Finished gold attempts in play order, kept so the board can show them afterwards. */
  goldResults: GoldAttempt[];
  status: GameStatus;
  /** The "who goes first" card on the board has been shown. */
  startRevealed: boolean;
  /** Words shown so far in play order. Only Learning games keep them, for the review screen. */
  played: PlayedWord[];
}

/** A score change for one team. Negative values are penalties, scores may go below zero. */
export interface ScoreDelta {
  teamId: number;
  points: number;
}
