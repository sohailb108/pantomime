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
  teamColors?: string[];
  categoryIds?: string[];
  /** Every category that existed when the selection was last saved; newer ones start selected. */
  knownCategoryIds?: string[];
}

function defaultColors(): string[] {
  return TEAM_COLORS.slice(0, MIN_TEAMS).map((c) => c.id);
}

/** Saved team colors if they are still a valid, duplicate-free team list. */
function validColors(saved: string[] | undefined): string[] {
  const ids = new Set<string>(TEAM_COLORS.map((c) => c.id));
  if (
    Array.isArray(saved) &&
    saved.length >= MIN_TEAMS &&
    saved.length <= MAX_TEAMS &&
    saved.every((c) => ids.has(c)) &&
    new Set(saved).size === saved.length
  )
    return [...saved];
  return defaultColors();
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
 * Draft of a new game while the setup screens are open. Everything is remembered for the next
 * game (teams, categories, mode and settings), so players can accept it and go straight on.
 */
export const useSetupStore = defineStore('setup', () => {
  const saved = loadJson<SavedSetup>(SETUP_STORAGE_KEY);
  const teamColors = ref<string[]>(validColors(saved?.teamColors));
  const categoryIds = ref<string[]>(
    Array.isArray(saved?.categoryIds) ? saved.categoryIds.filter((c) => typeof c === 'string') : [],
  );
  const knownCategoryIds = ref<string[]>(
    Array.isArray(saved?.knownCategoryIds) ? saved.knownCategoryIds : [],
  );
  const mode = ref<Mode>(saved?.mode === 'multi' ? 'multi' : 'single');
  const settings = ref<Settings>(mergedSettings(saved?.settings));

  watch(
    [mode, settings, teamColors, categoryIds, knownCategoryIds],
    () =>
      saveJson(SETUP_STORAGE_KEY, {
        mode: mode.value,
        settings: settings.value,
        teamColors: teamColors.value,
        categoryIds: categoryIds.value,
        knownCategoryIds: knownCategoryIds.value,
      } satisfies SavedSetup),
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
  /**
   * Matches the remembered selection to the categories that exist now: drops removed ones, selects
   * new ones, and selects everything when nothing is left (first game, or a different language).
   */
  function syncCategories(allIds: string[]) {
    const all = new Set(allIds);
    const known = new Set(knownCategoryIds.value);
    const next = categoryIds.value.filter((id) => all.has(id));
    for (const id of allIds) if (!known.has(id) && !next.includes(id)) next.push(id);
    categoryIds.value = next.length > 0 ? next : [...allIds];
    knownCategoryIds.value = [...allIds];
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
    syncCategories,
  };
});
