import { Quasar } from 'quasar';
import { getLanguage } from '@/i18n/languages';

const loadedFonts = new Set<string>();

/**
 * Applies a language's configuration to the page: <html lang/dir>,
 * the --app-font CSS variable, the font files and the Quasar language pack.
 */
let latest = 0;

export async function applyLanguage(code: string): Promise<void> {
  const token = ++latest;
  const lang = getLanguage(code);
  const root = document.documentElement;

  root.lang = lang.code;
  root.dir = lang.dir;
  root.style.setProperty('--app-font', lang.font.family);

  if (lang.font.load && !loadedFonts.has(lang.code)) {
    await lang.font.load();
    loadedFonts.add(lang.code);
  }

  const pack = (await lang.quasarLang()).default;
  // A newer call started while this one was loading: let it have the last word.
  if (token !== latest) return;
  // Direction comes from our own config, not from the Quasar pack.
  Quasar.lang.set({ ...pack, rtl: lang.dir === 'rtl' });
  // Quasar.lang.set() also touches <html lang/dir>, so enforce ours again.
  root.lang = lang.code;
  root.dir = lang.dir;
}
