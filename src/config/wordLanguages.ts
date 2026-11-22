/**
 * Languages a game's words can be in. Separate from the interface languages (`i18n/languages.ts`):
 * a word language needs only a pack folder (`src/packs/<code>/`), not a translation of the app.
 */
export interface WordLanguage {
  /** Language code, also the packs folder name. */
  code: string;
  /** Native language name, shown in the word language picker. */
  name: string;
  /** Text direction of the words. */
  dir: 'rtl' | 'ltr';
  /** CSS font-family stack for its name in the picker (the same as the interface language's, if any). */
  font: string;
}

const SYSTEM_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const wordLanguages: WordLanguage[] = [
  { code: 'fa', name: 'فارسی', dir: 'rtl', font: "'Vazirmatn', sans-serif" },
  { code: 'en', name: 'English', dir: 'ltr', font: SYSTEM_FONT },
  { code: 'de', name: 'Deutsch', dir: 'ltr', font: SYSTEM_FONT },
];

export function getWordLanguage(code: string): WordLanguage | undefined {
  return wordLanguages.find((l) => l.code === code);
}
