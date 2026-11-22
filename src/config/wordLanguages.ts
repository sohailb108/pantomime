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
}

export const wordLanguages: WordLanguage[] = [
  { code: 'fa', name: 'فارسی', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
];

export function getWordLanguage(code: string): WordLanguage | undefined {
  return wordLanguages.find((l) => l.code === code);
}
