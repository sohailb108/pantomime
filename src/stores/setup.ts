import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import { firstFreeColor, TEAM_COLORS } from '@/config/teamColors';
import { MAX_TEAMS, MIN_TEAMS, minCategoriesFor, trimmedTileCount } from '@/game/board';
import { normalContent, sortLevels } from '@/game/content';
import { DIFFICULTIES, type Content, type Level, type Mode, type PackKind, type Settings } from '@/game/types';
import { getWordLanguage } from '@/config/wordLanguages';
import { hasLearning, learningLevels } from '@/services/learningPacks';
import { loadJson, saveJson } from '@/services/storage';
import { useSettingsStore } from './settings';

const SETUP_STORAGE_KEY = 'pantomime:setup';

interface SavedSetup {
  /** Language the words are in, or missing to follow the interface language. */
  wordLanguage?: string | null;
  /** Normal or learning packs; missing means normal. */
  packKind?: PackKind;
  /** CEFR levels picked for learning packs. */
  levels?: Level[];
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
  const settingsStore = useSettingsStore();
  /** The word language the player picked, or null while the words follow the interface language. */
  const wordLanguage = ref<string | null>(
    saved?.wordLanguage && getWordLanguage(saved.wordLanguage) ? saved.wordLanguage : null,
  );
  /** Language of the words a game draws from (and of the packs screens). */
  const contentLang = computed(() => wordLanguage.value ?? settingsStore.language);
  const packKind = ref<PackKind>(saved?.packKind === 'learning' ? 'learning' : 'normal');
  const levels = ref<Level[]>(sortLevels(Array.isArray(saved?.levels) ? saved.levels : []));
  /** Whether the word language has learning packs, so the pack type can be chosen. */
  const learningAvailable = computed(() => hasLearning(contentLang.value));
  /** Levels the word language has words for. */
  const availableLevels = computed(() => learningLevels(contentLang.value));
  /** Picked levels that exist for the language; the first available one when none of them do. */
  const activeLevels = computed<Level[]>(() => {
    const picked = levels.value.filter((l) => availableLevels.value.includes(l));
    return picked.length > 0 ? picked : availableLevels.value.slice(0, 1);
  });
  /** Words a game draws from. Learning only applies where the language has learning packs. */
  const content = computed<Content>(() =>
    packKind.value === 'learning' && learningAvailable.value && activeLevels.value.length > 0
      ? { lang: contentLang.value, kind: 'learning', levels: activeLevels.value }
      : normalContent(contentLang.value),
  );
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
    [wordLanguage, packKind, levels, mode, settings, teamColors, categoryIds, knownCategoryIds],
    () =>
      saveJson(SETUP_STORAGE_KEY, {
        wordLanguage: wordLanguage.value,
        packKind: packKind.value,
        levels: levels.value,
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

  function setWordLanguage(code: string) {
    if (getWordLanguage(code)) wordLanguage.value = code;
  }
  function setPackKind(kind: PackKind) {
    packKind.value = kind;
  }
  /** Adds or removes a level; at least one stays picked, and only levels with words count. */
  function toggleLevel(level: Level) {
    if (!availableLevels.value.includes(level)) return;
    const current = activeLevels.value;
    if (current.includes(level)) {
      if (current.length > 1) levels.value = current.filter((l) => l !== level);
    } else {
      levels.value = sortLevels([...current, level]);
    }
  }
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
  /** Drops selected categories that no longer exist (removed, or another word language). */
  function pruneCategories(allIds: string[]) {
    const all = new Set(allIds);
    const dropped = new Set(categoryIds.value.filter((id) => !all.has(id)));
    if (dropped.size === 0) return;
    categoryIds.value = categoryIds.value.filter((id) => all.has(id));
    // A dropped id was selected, not deselected: forget it, so it is selected again when it returns.
    knownCategoryIds.value = knownCategoryIds.value.filter((id) => !dropped.has(id));
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
    // Keep ids of other languages, so a deselection survives a language switch.
    knownCategoryIds.value = [...new Set([...known, ...allIds])];
  }

  return {
    wordLanguage,
    contentLang,
    setWordLanguage,
    packKind,
    activeLevels,
    availableLevels,
    learningAvailable,
    content,
    setPackKind,
    toggleLevel,
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
    pruneCategories,
    syncCategories,
  };
});
