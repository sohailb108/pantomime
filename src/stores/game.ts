import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import { TEAM_COLORS } from '@/config/teamColors';
import { createGame, declineGoldAttempt, finishTurn, resolveGoldAttempt } from '@/game/game';
import type { Difficulty, GameState, Mode, ScoreDelta, Settings } from '@/game/types';
import { buildDeck, isPoolExhausted } from '@/game/words';
import { loadJson, removeKey, saveJson } from '@/services/storage';
import { getGoldPool, getPool } from '@/services/words';

const GOLD_KEY = 'gold';
const GAME_STORAGE_KEY = 'pantomime:game';
const HISTORY_STORAGE_KEY = 'pantomime:history';

interface SavedGame {
  state: GameState;
  lang: string;
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
    // Games saved when teams still had names get palette colors by team order.
    state.value.teams.forEach((team, i) => {
      team.color ??= TEAM_COLORS[i % TEAM_COLORS.length]!.id;
    });
  }
  /** Language the game's words come from, fixed when the game starts. */
  const lang = ref(saved?.lang ?? 'fa');
  /** Tile the current team picked on the board. Not saved: an interrupted turn restarts. */
  const pickedTile = ref<number | null>(null);
  const history = ref<History>(loadJson<History>(HISTORY_STORAGE_KEY) ?? {});

  watch(
    [state, lang],
    () => {
      if (state.value) saveJson(GAME_STORAGE_KEY, { state: state.value, lang: lang.value });
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
    lang: string;
  }) {
    const { lang: language, ...rest } = options;
    state.value = createGame({ ...rest, rng: Math.random });
    lang.value = language;
    pickedTile.value = null;
  }

  function pick(index: number | null) {
    pickedTile.value = index;
  }

  function poolKey(categoryId: string, difficulty: Difficulty) {
    return `${categoryId}:${difficulty}`;
  }

  function deckFor(poolId: string, pool: string[]): string[] {
    const langHistory = (history.value[lang.value] ??= {});
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
    return deckFor(poolKey(categoryId, difficulty), getPool(lang.value, categoryId, difficulty));
  }

  function goldDeck(): string[] {
    return deckFor(GOLD_KEY, getGoldPool(lang.value));
  }

  /** Records a word as used so later games do not draw it again soon. */
  function markSeen(poolId: string, word: string) {
    const list = ((history.value[lang.value] ??= {})[poolId] ??= []);
    if (!list.includes(word)) list.push(word);
  }
  function markTileSeen(categoryId: string, difficulty: Difficulty, word: string) {
    markSeen(poolKey(categoryId, difficulty), word);
  }
  function markGoldSeen(word: string) {
    markSeen(GOLD_KEY, word);
  }

  function finish(deltas: ScoreDelta[]) {
    if (!state.value || pickedTile.value === null) return;
    state.value = finishTurn(state.value, pickedTile.value, deltas, Math.random);
    pickedTile.value = null;
  }

  function finishGold(success: boolean) {
    if (state.value) state.value = resolveGoldAttempt(state.value, success);
  }

  function declineGold() {
    if (state.value) state.value = declineGoldAttempt(state.value);
  }

  return {
    state,
    lang,
    pickedTile,
    start,
    pick,
    tileDeck,
    goldDeck,
    markTileSeen,
    markGoldSeen,
    finish,
    finishGold,
    declineGold,
  };
});
