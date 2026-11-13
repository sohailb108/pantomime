import { DIFFICULTIES, type Difficulty } from '@/game/types';

/** Words per difficulty. */
export type WordsByDifficulty = Record<Difficulty, string[]>;

export interface CustomCategory {
  id: string;
  name: string;
  words: WordsByDifficulty;
}

/** Custom content of one language. */
export interface CustomLang {
  categories: CustomCategory[];
  /** Extra words for built-in categories, by category id. */
  extra: Record<string, WordsByDifficulty>;
  /** Names of custom categories that were merged into built-in ones, by built-in category id. */
  extraNames: Record<string, string>;
  /** Extra gold-round words. */
  gold: string[];
  /** Built-in words the user hid, by category id. */
  hidden: Record<string, WordsByDifficulty>;
  /** Built-in gold words the user hid. */
  hiddenGold: string[];
}

export const MAX_WORD_LENGTH = 80;
export const MAX_CATEGORIES = 100;
export const MAX_WORDS_PER_LIST = 2000;
export const MAX_NAME_LENGTH = 30;
/** Keys of `extra` and `hidden`: built-in or custom category ids. Rules out keys like __proto__. */
const CATEGORY_KEY = /^[a-z0-9][a-z0-9-]{0,40}$/;
export const EXPORT_SCHEMA = 1;

export function emptyWords(): WordsByDifficulty {
  return { 1: [], 2: [], 3: [] };
}
export function emptyLang(): CustomLang {
  return { categories: [], extra: {}, extraNames: {}, gold: [], hidden: {}, hiddenGold: [] };
}
/** Fills fields that older saved data does not have. */
export function normalizeLang(data: Partial<CustomLang>): CustomLang {
  const lang = { ...emptyLang(), ...data };
  // Saves from before categories lost their color may still carry the field.
  lang.categories = lang.categories.map(({ id, name, words }) => ({ id, name, words }));
  return lang;
}

/**
 * Moves the words of custom categories that share a name with a built-in category into that
 * built-in category's extra words, and removes the custom category. The name is kept so the
 * words can become a custom category again if the built-in one is removed later.
 * Returns how many categories were merged.
 */
export function absorbBuiltinDuplicates(
  data: CustomLang,
  builtins: readonly { id: string; name: string }[],
): number {
  let merged = 0;
  data.categories = data.categories.filter((c) => {
    const builtin = builtins.find((b) => same(b.name, c.name));
    if (!builtin) return true;
    addWords((data.extra[builtin.id] ??= emptyWords()), c.words);
    data.extraNames[builtin.id] ??= c.name;
    merged++;
    return false;
  });
  return merged;
}

/**
 * Turns extra words of categories that no longer exist (a built-in category removed by an update)
 * back into custom categories, so the user's words are never lost. Uses the saved name, or the old
 * id when none was saved. Returns how many categories were restored.
 */
export function restoreOrphanedExtras(
  data: CustomLang,
  builtins: readonly { id: string }[],
  newId: () => string,
): number {
  let restored = 0;
  for (const [id, words] of Object.entries(data.extra)) {
    if (builtins.some((b) => b.id === id) || data.categories.some((c) => c.id === id)) continue;
    const hasWords = DIFFICULTIES.some((d) => words[d].length > 0);
    if (hasWords) {
      const name = normalizeName(data.extraNames[id] ?? id) ?? id.slice(0, MAX_NAME_LENGTH);
      let target = data.categories.find((c) => same(c.name, name));
      if (!target) {
        if (data.categories.length >= MAX_CATEGORIES) continue;
        target = { id: newId(), name, words: emptyWords() };
        data.categories.push(target);
        restored++;
      }
      addWords(target.words, words);
    }
    delete data.extra[id];
    delete data.extraNames[id];
    delete data.hidden[id];
  }
  return restored;
}

/** Finds a built-in or custom category by name (ignoring case), optionally skipping one id. */
export function findCategoryByName(
  name: string,
  builtins: readonly { id: string; name: string }[],
  customs: readonly { id: string; name: string }[],
  exceptId?: string,
): { id: string; builtin: boolean } | undefined {
  const b = builtins.find((c) => same(c.name, name));
  if (b) return { id: b.id, builtin: true };
  const c = customs.find((c) => c.id !== exceptId && same(c.name, name));
  return c ? { id: c.id, builtin: false } : undefined;
}

/** Case-insensitive membership test. */
export function hasWord(list: readonly string[], word: string): boolean {
  return list.some((w) => same(w, word));
}

/** Trims and collapses whitespace. Returns null when the word is empty or too long. */
export function normalizeWord(raw: string): string | null {
  const word = raw.replace(/\s+/g, ' ').trim();
  return word.length > 0 && word.length <= MAX_WORD_LENGTH ? word : null;
}

export function normalizeName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

/**
 * Key for comparing words and names: lowercased, Unicode-normalized, and with the Arabic letter
 * variants that look the same as the Persian ones (ي ك) folded, so typing with either keyboard
 * layout finds the same word.
 */
export function compareKey(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

const same = (a: string, b: string) => compareKey(a) === compareKey(b);

export type AddResult = 'ok' | 'invalid' | 'duplicate' | 'full';

/** Adds a word to a list in place. */
export function addToList(list: string[], raw: string): AddResult {
  const word = normalizeWord(raw);
  if (word === null) return 'invalid';
  if (list.some((w) => same(w, word))) return 'duplicate';
  if (list.length >= MAX_WORDS_PER_LIST) return 'full';
  list.push(word);
  return 'ok';
}

/**
 * Like `addToList` for many words into one list: remembers the comparison keys of the words in a Set, so each
 * add is O(1) instead of a scan of the whole list. Use it for imports and merges.
 */
export function listAdder(list: string[]): (raw: string) => AddResult {
  const seen = new Set(list.map(compareKey));
  return (raw) => {
    const word = normalizeWord(raw);
    if (word === null) return 'invalid';
    const key = compareKey(word);
    if (seen.has(key)) return 'duplicate';
    if (list.length >= MAX_WORDS_PER_LIST) return 'full';
    seen.add(key);
    list.push(word);
    return 'ok';
  };
}

/** Removes a word from a list in place (ignoring case). */
export function removeFromList(list: string[], word: string) {
  const i = list.findIndex((w) => same(w, word));
  if (i >= 0) list.splice(i, 1);
}

/** Adds the words of `from` to `to`, skipping duplicates. Returns how many were added. */
function addWords(to: WordsByDifficulty, from: WordsByDifficulty): number {
  return DIFFICULTIES.reduce((sum, d) => sum + addAll(to[d], from[d]), 0);
}

function addAll(to: string[], from: readonly string[]): number {
  const add = listAdder(to);
  return from.filter((w) => add(w) === 'ok').length;
}

/** Whether a custom category has a word at every difficulty. */
export function isComplete(category: CustomCategory): boolean {
  return DIFFICULTIES.every((d) => category.words[d].length > 0);
}

// ---------- Export and import ----------

export interface ExportFile {
  schema: number;
  custom: true;
  lang: string;
  categories: CustomCategory[];
  extra: Record<string, WordsByDifficulty>;
  extraNames: Record<string, string>;
  gold: string[];
  hidden: Record<string, WordsByDifficulty>;
  hiddenGold: string[];
}

export function buildExport(lang: string, data: CustomLang): ExportFile {
  return { schema: EXPORT_SCHEMA, custom: true, lang, ...JSON.parse(JSON.stringify(data)) };
}

export type ImportError = 'invalid' | 'schema' | 'language' | 'tooLarge';

export type ParsedImport =
  { ok: true; lang: string; data: CustomLang } | { ok: false; error: ImportError };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Cleans a list of words: keeps valid strings, drops duplicates. Null if it is not an array or too long. */
function cleanList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_WORDS_PER_LIST) return null;
  const out: string[] = [];
  const add = listAdder(out);
  for (const item of value) {
    if (typeof item === 'string') add(item);
  }
  return out;
}

function cleanWords(value: unknown): WordsByDifficulty | null {
  if (!isObject(value)) return null;
  const out = emptyWords();
  for (const d of DIFFICULTIES) {
    const list = value[String(d)] === undefined ? [] : cleanList(value[String(d)]);
    if (list === null) return null;
    out[d] = list;
  }
  return out;
}

/** Validates an exported file. Anything unexpected makes the whole import fail, nothing is partially applied. */
export function parseImport(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  if (!isObject(raw) || raw.custom !== true || typeof raw.lang !== 'string') {
    return { ok: false, error: 'invalid' };
  }
  if (raw.schema !== EXPORT_SCHEMA) return { ok: false, error: 'schema' };

  const data = emptyLang();

  const cats = raw.categories ?? [];
  if (!Array.isArray(cats)) return { ok: false, error: 'invalid' };
  if (cats.length > MAX_CATEGORIES) return { ok: false, error: 'tooLarge' };
  for (const c of cats) {
    if (!isObject(c) || typeof c.id !== 'string' || !/^c-[a-z0-9]{1,20}$/.test(c.id)) {
      return { ok: false, error: 'invalid' };
    }
    const name = typeof c.name === 'string' ? normalizeName(c.name) : null;
    const words = cleanWords(c.words);
    if (name === null || words === null) return { ok: false, error: 'invalid' };
    data.categories.push({ id: c.id, name, words });
  }

  const extra = raw.extra ?? {};
  if (!isObject(extra)) return { ok: false, error: 'invalid' };
  if (Object.keys(extra).length > MAX_CATEGORIES) return { ok: false, error: 'tooLarge' };
  for (const [id, value] of Object.entries(extra)) {
    if (!CATEGORY_KEY.test(id)) return { ok: false, error: 'invalid' };
    const words = cleanWords(value);
    if (words === null) return { ok: false, error: 'invalid' };
    data.extra[id] = words;
  }

  const names = raw.extraNames ?? {};
  if (!isObject(names)) return { ok: false, error: 'invalid' };
  if (Object.keys(names).length > MAX_CATEGORIES) return { ok: false, error: 'tooLarge' };
  for (const [id, value] of Object.entries(names)) {
    const name = typeof value === 'string' ? normalizeName(value) : null;
    if (!CATEGORY_KEY.test(id) || name === null) return { ok: false, error: 'invalid' };
    data.extraNames[id] = name;
  }

  const gold = raw.gold === undefined ? [] : cleanList(raw.gold);
  if (gold === null) return { ok: false, error: 'invalid' };
  data.gold = gold;

  const hidden = raw.hidden ?? {};
  if (!isObject(hidden)) return { ok: false, error: 'invalid' };
  if (Object.keys(hidden).length > MAX_CATEGORIES) return { ok: false, error: 'tooLarge' };
  for (const [id, value] of Object.entries(hidden)) {
    if (!CATEGORY_KEY.test(id)) return { ok: false, error: 'invalid' };
    const words = cleanWords(value);
    if (words === null) return { ok: false, error: 'invalid' };
    data.hidden[id] = words;
  }
  const hiddenGold = raw.hiddenGold === undefined ? [] : cleanList(raw.hiddenGold);
  if (hiddenGold === null) return { ok: false, error: 'invalid' };
  data.hiddenGold = hiddenGold;

  return { ok: true, lang: raw.lang, data };
}

/**
 * Gets `record[id]`, creating it when missing. Only own keys count: ids like "constructor" pass
 * `CATEGORY_KEY` and would otherwise find the inherited `Object` function and never get created.
 */
function ownOrCreate<T>(record: Record<string, T>, id: string, make: () => T): T {
  if (!Object.hasOwn(record, id)) record[id] = make();
  return record[id]!;
}

/** Merges imported data into `target` in place: only adds, never removes or overwrites. Returns how many words were added. */
export function mergeInto(target: CustomLang, incoming: CustomLang): number {
  let added = 0;

  for (const c of incoming.categories) {
    // Same id, or the same name under another id (the category was created by hand on both sides).
    let existing =
      target.categories.find((t) => t.id === c.id) ??
      target.categories.find((t) => same(t.name, c.name));
    if (!existing) {
      if (target.categories.length >= MAX_CATEGORIES) continue;
      existing = { id: c.id, name: c.name, words: emptyWords() };
      target.categories.push(existing);
    }
    added += addWords(existing.words, c.words);
  }
  for (const [id, words] of Object.entries(incoming.extra)) {
    added += addWords(ownOrCreate(target.extra, id, emptyWords), words);
  }
  for (const [id, name] of Object.entries(incoming.extraNames)) {
    if (!Object.hasOwn(target.extraNames, id)) target.extraNames[id] = name;
  }
  added += addAll(target.gold, incoming.gold);
  // Hidden lists only grow with an import. They do not count as added words.
  for (const [id, words] of Object.entries(incoming.hidden)) {
    addWords(ownOrCreate(target.hidden, id, emptyWords), words);
  }
  addAll(target.hiddenGold, incoming.hiddenGold);
  return added;
}
