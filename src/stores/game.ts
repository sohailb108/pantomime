import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import { TEAM_COLORS } from '@/config/teamColors';
import { createGame, declineGoldAttempt, finishTurn, resolveGoldAttempt } from '@/game/game';
import { historyNamespace, readContent } from '@/game/content';
import type { Content, Difficulty, GameState, Mode, ScoreDelta, Settings, TurnWord } from '@/game/types';
import { buildDeck, isPoolExhausted } from '@/game/words';
import { loadJson, removeKey, saveJson } from '@/services/storage';
import { getGoldPool, getPool } from '@/services/words';

const GOLD_KEY = 'gold';
const GAME_STORAGE_KEY = 'pantomime:game';
const HISTORY_STORAGE_KEY = 'pantomime:history';

interface SavedGame {
  state: GameState;
  /** Games saved before learning packs have only `lang`. */
  lang?: string;
  content?: Content;
}

/** Words shown so far: language, then pool id, then words. Kept across games. */
type History = Record<string, Record<string, string[]>>;

/** The active game (auto-saved) and the word history. */
export const useGameStore = defineStore('game', () => {
  const saved = loadJson<SavedGame>(GAME_STORAGE_KEY);
  const state = ref<GameState | null>(saved?.state ?? null);
  // Games saved before tile points were configurable have no points setting.
  if (state.value) {
    state.value.settings.points ??= { ...DEFAULT_GAME_SETTINGS.points };
    state.value.settings.single.stealHalf ??= false;
    // Games saved before acting hints existed use the default penalty.
    state.value.settings.single.hint ??= true;
    state.value.settings.single.hintPenalty ??= DEFAULT_GAME_SETTINGS.single.hintPenalty;
    state.value.settings.single.hintHalf ??= false;
    state.value.settings.single.allowRevert ??= DEFAULT_GAME_SETTINGS.single.allowRevert;
    // Games saved before the reveal existed are already under way.
    state.value.startRevealed ??= true;
    // The starter of older games is unknown, so their turn order shows from team 0.
    state.value.starter ??= 0;
    // Games saved before gold results were kept have none.
    state.value.goldResults ??= [];
    // Games saved before the review screen kept no words.
    state.value.played ??= [];
    state.value.settings.gold.timerSeconds ??= DEFAULT_GAME_SETTINGS.gold.timerSeconds;
    // Games saved when teams still had names get palette colors by team order.
    state.value.teams.forEach((team, i) => {
      team.color ??= TEAM_COLORS[i % TEAM_COLORS.length]!.id;
    });
  }
  /** What the game's words come from, fixed when the game starts. An old save is normal content. */
  const content = ref<Content>(readContent(saved?.content, saved?.lang ?? 'fa'));
  /** Language the game's words come from. */
  const lang = computed(() => content.value.lang);
  /** Tile the current team picked on the board. Not saved: an interrupted turn restarts. */
  const pickedTile = ref<number | null>(null);
  const history = ref<History>(loadJson<History>(HISTORY_STORAGE_KEY) ?? {});

  watch(
    [state, content],
    () => {
      if (state.value) saveJson(GAME_STORAGE_KEY, { state: state.value, content: content.value });
      else removeKey(GAME_STORAGE_KEY);
    },
    { deep: true },
  );
  watch(history, () => saveJson(HISTORY_STORAGE_KEY, history.value), { deep: true });

  function start(options: {
    teamColors: string[];
    categoryIds: string[];
    mode: Mode;
    settings: Settings;
    content: Content;
  }) {
    const { content: chosen, ...rest } = options;
    state.value = createGame({ ...rest, rng: Math.random });
    content.value = chosen;
    pickedTile.value = null;
  }

  function pick(index: number | null) {
    pickedTile.value = index;
  }

  function poolKey(categoryId: string, difficulty: Difficulty) {
    return `${categoryId}:${difficulty}`;
  }

  function deckFor(poolId: string, pool: string[]): string[] {
    const langHistory = (history.value[historyNamespace(content.value)] ??= {});
    // Forget words that left the pool (hidden, removed or deleted with their category).
    const inPool = new Set(pool);
    const old = langHistory[poolId] ?? [];
    const kept = old.filter((w) => inPool.has(w));
    if (kept.length !== old.length) langHistory[poolId] = kept;
    let seen = new Set(kept);
    // Every word was used: start over instead of repeating the same order.
    if (isPoolExhausted(pool, seen)) {
      langHistory[poolId] = [];
      seen = new Set();
    }
    return buildDeck(pool, seen, Math.random);
  }

  /** Shuffled words for the picked tile, unseen words first. */
  function tileDeck(categoryId: string, difficulty: Difficulty): string[] {
    return deckFor(poolKey(categoryId, difficulty), getPool(content.value, categoryId, difficulty));
  }

  function goldDeck(): string[] {
    return deckFor(GOLD_KEY, getGoldPool(content.value));
  }

  /** Records a word as used so later games do not draw it again soon. */
  function markSeen(poolId: string, word: string) {
    const list = ((history.value[historyNamespace(content.value)] ??= {})[poolId] ??= []);
    if (!list.includes(word)) list.push(word);
  }
  function markTileSeen(categoryId: string, difficulty: Difficulty, word: string) {
    markSeen(poolKey(categoryId, difficulty), word);
  }
  function markGoldSeen(word: string) {
    markSeen(GOLD_KEY, word);
  }

  function finish(deltas: ScoreDelta[], words: readonly TurnWord[] = []) {
    if (!state.value || pickedTile.value === null) return;
    // Only Learning games review their words.
    const kept = content.value.kind === 'learning' ? words : [];
    state.value = finishTurn(state.value, pickedTile.value, deltas, Math.random, kept);
    pickedTile.value = null;
  }

  /** The first-team card was shown; it is not shown again for this game. */
  function revealStart() {
    if (state.value) state.value.startRevealed = true;
  }

  function finishGold(success: boolean) {
    if (state.value) state.value = resolveGoldAttempt(state.value, success);
  }

  /** Discards the running game (and its saved copy). */
  function abort() {
    state.value = null;
    pickedTile.value = null;
  }

  function declineGold() {
    if (state.value) state.value = declineGoldAttempt(state.value);
  }

  return {
    state,
    content,
    lang,
    pickedTile,
    start,
    pick,
    tileDeck,
    goldDeck,
    markTileSeen,
    markGoldSeen,
    finish,
    revealStart,
    finishGold,
    declineGold,
    abort,
  };
});
