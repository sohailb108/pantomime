import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Difficulty } from '@/game/types';
import { listBuiltinCategories } from '@/services/packs';
import {
  absorbBuiltinDuplicates,
  addToList,
  buildExport,
  emptyLang,
  emptyWords,
  mergeInto,
  MAX_CATEGORIES,
  normalizeLang,
  normalizeName,
  hasWord,
  parseImport,
  type AddResult,
  type CustomCategory,
  type CustomLang,
  type ImportError,
} from '@/services/customData';
import { loadJson, saveJson } from '@/services/storage';

const KEY = 'pantomime:custom';

type CustomData = Record<string, CustomLang>;

function newId(): string {
  return `c-${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;
}

/** Custom categories and words, per language. Auto-saved. */
export const useCustomStore = defineStore('custom', () => {
  const saved = loadJson<Record<string, Partial<CustomLang>>>(KEY) ?? {};
  const data = ref<CustomData>(
    Object.fromEntries(
      Object.entries(saved).map(([lang, d]) => {
        const normalized = normalizeLang(d);
        absorbBuiltinDuplicates(normalized, listBuiltinCategories(lang));
        return [lang, normalized];
      }),
    ),
  );
  watch(data, () => saveJson(KEY, data.value), { deep: true });

  /** Custom content of a language. Reading does not create anything, so it is safe in computeds. */
  function of(lang: string): CustomLang {
    return data.value[lang] ?? emptyLang();
  }
  function ensure(lang: string): CustomLang {
    return (data.value[lang] ??= emptyLang());
  }

  function addCategory(lang: string, rawName: string): string | null {
    const name = normalizeName(rawName);
    const target = ensure(lang);
    if (name === null || target.categories.length >= MAX_CATEGORIES) return null;
    const id = newId();
    target.categories.push({ id, name, words: emptyWords() });
    return id;
  }
  function findCategory(lang: string, id: string): CustomCategory | undefined {
    return of(lang).categories.find((c) => c.id === id);
  }
  function updateCategory(lang: string, id: string, rawName: string): boolean {
    const category = data.value[lang]?.categories.find((c) => c.id === id);
    const name = normalizeName(rawName);
    if (!category || name === null) return false;
    category.name = name;
    return true;
  }
  function removeCategory(lang: string, id: string) {
    const target = data.value[lang];
    if (target) target.categories = target.categories.filter((c) => c.id !== id);
  }

  /** Custom words of one category (custom or built-in) at one difficulty. */
  function wordsOf(lang: string, categoryId: string, difficulty: Difficulty): string[] {
    const custom = of(lang);
    return (
      custom.categories.find((c) => c.id === categoryId)?.words[difficulty] ??
      custom.extra[categoryId]?.[difficulty] ??
      []
    );
  }
  function listFor(lang: string, categoryId: string, difficulty: Difficulty): string[] {
    const target = ensure(lang);
    const own = target.categories.find((c) => c.id === categoryId);
    return own ? own.words[difficulty] : (target.extra[categoryId] ??= emptyWords())[difficulty];
  }
  function addWord(
    lang: string,
    categoryId: string,
    difficulty: Difficulty,
    word: string,
  ): AddResult {
    return addToList(listFor(lang, categoryId, difficulty), word);
  }
  function removeWord(lang: string, categoryId: string, difficulty: Difficulty, word: string) {
    const list = listFor(lang, categoryId, difficulty);
    const i = list.indexOf(word);
    if (i >= 0) list.splice(i, 1);
  }

  function goldWords(lang: string): string[] {
    return of(lang).gold;
  }
  function addGold(lang: string, word: string): AddResult {
    return addToList(ensure(lang).gold, word);
  }
  function removeGold(lang: string, word: string) {
    const list = ensure(lang).gold;
    const i = list.indexOf(word);
    if (i >= 0) list.splice(i, 1);
  }

  /** Built-in words hidden in a category at one difficulty. */
  function hiddenOf(lang: string, categoryId: string, difficulty: Difficulty): string[] {
    return of(lang).hidden[categoryId]?.[difficulty] ?? [];
  }
  function hideWord(lang: string, categoryId: string, difficulty: Difficulty, word: string) {
    const list = ((ensure(lang).hidden[categoryId] ??= emptyWords())[difficulty] ??= []);
    if (!hasWord(list, word)) list.push(word);
  }
  function unhideWord(lang: string, categoryId: string, difficulty: Difficulty, word: string) {
    const list = ensure(lang).hidden[categoryId]?.[difficulty];
    if (list)
      ensure(lang).hidden[categoryId]![difficulty] = list.filter((w) => !hasWord([word], w));
  }
  function hiddenGold(lang: string): string[] {
    return of(lang).hiddenGold;
  }
  function hideGold(lang: string, word: string) {
    const list = ensure(lang).hiddenGold;
    if (!hasWord(list, word)) list.push(word);
  }
  function unhideGold(lang: string, word: string) {
    const target = ensure(lang);
    target.hiddenGold = target.hiddenGold.filter((w) => !hasWord([word], w));
  }

  function exportJson(lang: string): string {
    return JSON.stringify(buildExport(lang, of(lang)), null, 2);
  }
  /** Merges a file into the language's data. Nothing changes if the file is rejected. */
  function importJson(
    lang: string,
    text: string,
  ): { ok: true; added: number } | { ok: false; error: ImportError } {
    const parsed = parseImport(text);
    if (!parsed.ok) return parsed;
    if (parsed.lang !== lang) return { ok: false, error: 'language' };
    return { ok: true, added: mergeInto(ensure(lang), parsed.data) };
  }

  return {
    data,
    of,
    addCategory,
    findCategory,
    updateCategory,
    removeCategory,
    wordsOf,
    addWord,
    removeWord,
    goldWords,
    addGold,
    removeGold,
    hiddenOf,
    hideWord,
    unhideWord,
    hiddenGold,
    hideGold,
    unhideGold,
    exportJson,
    importJson,
  };
});
