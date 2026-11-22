import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { LEVELS } from '@/game/content';
import type { Level } from '@/game/types';
import {
  emptyLang,
  normalizeLang,
  place,
  placementOf as placementOfWord,
  type CustomLang,
  type Placement,
} from '@/services/customData';
import { loadJson, saveJson } from '@/services/storage';

const KEY = 'pantomime:learning';

const keyOf = (lang: string, level: Level) => `${lang}/${level}`;

/**
 * Where the user put the built-in words of learning packs (hidden, or moved to another difficulty),
 * per language and level. A word hidden at A1 stays hidden whenever A1 is part of the levels played.
 * Only the `overrides` part of `CustomLang` is used: there are no custom words in learning packs.
 * Auto-saved.
 */
export const useLearningStore = defineStore('learning', () => {
  const saved = loadJson<Record<string, Partial<CustomLang>>>(KEY) ?? {};
  const data = ref<Record<string, CustomLang>>(
    Object.fromEntries(Object.entries(saved).map(([key, d]) => [key, normalizeLang(d)])),
  );
  watch(data, () => saveJson(KEY, data.value), { deep: true });

  /** Reading does not create anything, so it is safe in computeds. */
  function of(lang: string, level: Level): CustomLang {
    return data.value[keyOf(lang, level)] ?? emptyLang();
  }

  /** Where a word of a category at a level is: hidden, moved to a difficulty, or `native`. */
  function placementOf(lang: string, level: Level, categoryId: string, word: string): Placement {
    return placementOfWord(of(lang, level), categoryId, word);
  }
  /** Hides a word, moves it to a difficulty, or puts it back (`native`). */
  function placeWord(
    lang: string,
    level: Level,
    categoryId: string,
    word: string,
    target: Placement,
  ) {
    place((data.value[keyOf(lang, level)] ??= emptyLang()), categoryId, word, target);
  }
  /** Words of a category at a level that the user hid. */
  function hiddenOf(lang: string, level: Level, categoryId: string): string[] {
    return of(lang, level).overrides[categoryId]?.hidden ?? [];
  }
  /** Every hidden word of a language, by level (CEFR order) then category, for the Packs screen. */
  function hiddenList(lang: string): { level: Level; categoryId: string; word: string }[] {
    const found: { level: Level; categoryId: string; word: string }[] = [];
    for (const level of LEVELS) {
      for (const [categoryId, o] of Object.entries(of(lang, level).overrides)) {
        for (const word of o.hidden) found.push({ level, categoryId, word });
      }
    }
    return found;
  }
  return { data, placementOf, placeWord, hiddenOf, hiddenList };
});

