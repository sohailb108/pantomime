import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import { firstFreeColor, TEAM_COLORS } from '@/config/teamColors';
import { MAX_TEAMS, MIN_TEAMS, minCategoriesFor, trimmedTileCount } from '@/game/board';
import { DIFFICULTIES, type Mode, type Settings } from '@/game/types';
import { loadJson, saveJson } from '@/services/storage';

const SETUP_STORAGE_KEY = 'pantomime:setup';

interface SavedSetup {
  mode: Mode;
  settings: Partial<Settings>;
}

function defaultColors(): string[] {
  return TEAM_COLORS.slice(0, MIN_TEAMS).map((c) => c.id);
}

function cloneSettings(): Settings {
  return structuredClone(DEFAULT_GAME_SETTINGS);
}

/** Saved settings laid over the defaults, so settings added later still get a value. */
function mergedSettings(saved: Partial<Settings> | undefined): Settings {
  const d = cloneSettings();
  if (!saved) return d;
  return {
    points: { ...d.points, ...saved.points },
    multi: { ...d.multi, ...saved.multi },
    single: {
      ...d.single,
      ...saved.single,
      timerSeconds: { ...d.single.timerSeconds, ...saved.single?.timerSeconds },
    },
    gold: { ...d.gold, ...saved.gold },
  };
}

/**
 * Draft of a new game while the setup screens are open. Teams and categories start fresh each
 * time; the mode and game settings are remembered for the next game.
 */
export const useSetupStore = defineStore('setup', () => {
  const teamColors = ref<string[]>(defaultColors());
  const categoryIds = ref<string[]>([]);
  const saved = loadJson<SavedSetup>(SETUP_STORAGE_KEY);
  const mode = ref<Mode>(saved?.mode === 'multi' ? 'multi' : 'single');
  const settings = ref<Settings>(mergedSettings(saved?.settings));

  watch(
    [mode, settings],
    () => saveJson(SETUP_STORAGE_KEY, { mode: mode.value, settings: settings.value }),
    { deep: true },
  );

  const teamCount = computed(() => teamColors.value.length);
  const minCategories = computed(() => minCategoriesFor(teamCount.value));

  /** Tiles left on the board after trimming for the current selection. */
  const trimmedCount = computed(() => trimmedTileCount(categoryIds.value.length, teamCount.value));
  const tileCount = computed(() => categoryIds.value.length * DIFFICULTIES.length - trimmedCount.value);

  function addTeam() {
    if (teamColors.value.length < MAX_TEAMS) {
      teamColors.value.push(firstFreeColor(teamColors.value));
    }
  }
  function removeTeam(index: number) {
    if (teamColors.value.length > MIN_TEAMS) teamColors.value.splice(index, 1);
  }
  /** Gives a team a color, unless another team already has it. */
  function setColor(index: number, color: string) {
    if (!teamColors.value.some((c, i) => c === color && i !== index))
      teamColors.value[index] = color;
  }
  function toggleCategory(id: string) {
    const i = categoryIds.value.indexOf(id);
    if (i >= 0) categoryIds.value.splice(i, 1);
    else categoryIds.value.push(id);
  }
  function resetSettings() {
    settings.value = cloneSettings();
  }
  function reset() {
    teamColors.value = defaultColors();
    categoryIds.value = [];
  }

  return {
    teamColors,
    categoryIds,
    mode,
    settings,
    teamCount,
    minCategories,
    tileCount,
    trimmedCount,
    addTeam,
    removeTeam,
    setColor,
    toggleCategory,
    resetSettings,
    reset,
  };
});
