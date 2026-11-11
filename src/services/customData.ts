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
  /** Extra gold-round words. */
  gold: string[];
  /** Built-in words the user hid, by category id. */
  hidden: Record<string, WordsByDifficulty>;
  /** Built-in gold words the user hid. */
  hiddenGold: string[];
}

export const MAX_WORD_LENGTH = 40;
export const MAX_CATEGORIES = 100;
export const MAX_WORDS_PER_LIST = 2000;
export const MAX_NAME_LENGTH = 30;
export const EXPORT_SCHEMA = 1;

export function emptyWords(): WordsByDifficulty {
  return { 1: [], 2: [], 3: [] };
}
export function emptyLang(): CustomLang {
  return { categories: [], extra: {}, gold: [], hidden: {}, hiddenGold: [] };
}
/** Fills fields that older saved data does not have. */
export function normalizeLang(data: Partial<CustomLang>): CustomLang {
  const lang = { ...emptyLang(), ...data };
  // Saves from before categories lost their color may still carry the field.
  lang.categories = lang.categories.map(({ id, name, words }) => ({ id, name, words }));
  return lang;
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

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

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
  for (const item of value) {
    if (typeof item === 'string') addToList(out, item);
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
    const words = cleanWords(value);
    if (words === null) return { ok: false, error: 'invalid' };
    data.extra[id] = words;
  }

  const gold = raw.gold === undefined ? [] : cleanList(raw.gold);
  if (gold === null) return { ok: false, error: 'invalid' };
  data.gold = gold;

  const hidden = raw.hidden ?? {};
  if (!isObject(hidden)) return { ok: false, error: 'invalid' };
  if (Object.keys(hidden).length > MAX_CATEGORIES) return { ok: false, error: 'tooLarge' };
  for (const [id, value] of Object.entries(hidden)) {
    const words = cleanWords(value);
    if (words === null) return { ok: false, error: 'invalid' };
    data.hidden[id] = words;
  }
  const hiddenGold = raw.hiddenGold === undefined ? [] : cleanList(raw.hiddenGold);
  if (hiddenGold === null) return { ok: false, error: 'invalid' };
  data.hiddenGold = hiddenGold;

  return { ok: true, lang: raw.lang, data };
}

/** Merges imported data into `target` in place: only adds, never removes or overwrites. Returns how many words were added. */
export function mergeInto(target: CustomLang, incoming: CustomLang): number {
  let added = 0;
  const mergeList = (to: string[], from: string[]) => {
    for (const w of from) if (addToList(to, w) === 'ok') added++;
  };
  const mergeWords = (to: WordsByDifficulty, from: WordsByDifficulty) => {
    for (const d of DIFFICULTIES) mergeList(to[d], from[d]);
  };

  for (const c of incoming.categories) {
    if (target.categories.length >= MAX_CATEGORIES && !target.categories.some((t) => t.id === c.id))
      continue;
    let existing = target.categories.find((t) => t.id === c.id);
    if (!existing) {
      existing = { id: c.id, name: c.name, words: emptyWords() };
      target.categories.push(existing);
    }
    mergeWords(existing.words, c.words);
  }
  for (const [id, words] of Object.entries(incoming.extra)) {
    mergeWords((target.extra[id] ??= emptyWords()), words);
  }
  mergeList(target.gold, incoming.gold);
  // Hidden lists only grow with an import. They do not count as added words.
  for (const [id, words] of Object.entries(incoming.hidden)) {
    const to = (target.hidden[id] ??= emptyWords());
    for (const d of DIFFICULTIES) for (const w of words[d]) addToList(to[d], w);
  }
  for (const w of incoming.hiddenGold) addToList(target.hiddenGold, w);
  return added;
}
