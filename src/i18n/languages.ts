import type { QuasarLanguage } from 'quasar';

/** Per-language configuration: direction, font, numerals and Quasar pack. */
export interface LanguageConfig {
  /** Language code, also the locale key and the packs folder name. */
  code: string;
  /** Native language name, shown in the language picker. */
  name: string;
  /** Text direction. */
  dir: 'rtl' | 'ltr';
  font: {
    /** CSS font-family stack, exposed as the `--app-font` CSS variable. */
    family: string;
    /** Loads the font files (e.g. a self-hosted @fontsource CSS import). Optional. */
    load?: () => Promise<unknown>;
  };
  /** Numbering system for Intl.NumberFormat, e.g. 'arabext' (Persian digits), 'latn'. */
  numerals: string;
  /** Loader for the matching Quasar language pack (component labels). */
  quasarLang: () => Promise<{ default: QuasarLanguage }>;
}

export const languages: LanguageConfig[] = [
  {
    code: 'fa',
    name: 'فارسی',
    dir: 'rtl',
    font: {
      family: "'Vazirmatn', sans-serif",
      load: () => import('@fontsource/vazirmatn/arabic-400.css'),
    },
    numerals: 'arabext',
    quasarLang: () => import('quasar/lang/fa-IR'),
  },
  {
    code: 'en',
    name: 'English',
    dir: 'ltr',
    font: { family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
    numerals: 'latn',
    quasarLang: () => import('quasar/lang/en-US'),
  },
];

export function getLanguage(code: string): LanguageConfig {
  return languages.find((l) => l.code === code) ?? languages[0]!;
}
