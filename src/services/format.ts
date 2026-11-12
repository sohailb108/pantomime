import { getLanguage } from '@/i18n/languages';

const formatters = new Map<string, Intl.NumberFormat>();

/** One shared formatter per language and sign style: building them is comparatively slow. */
function formatterFor(lang: string, signed: boolean): Intl.NumberFormat {
  const key = `${lang}|${signed}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(
      `${lang}-u-nu-${getLanguage(lang).numerals}`,
      signed ? { signDisplay: 'exceptZero' } : undefined,
    );
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Formats a number with the language's numbering system (display only). */
export function formatNumber(value: number, lang: string): string {
  return formatterFor(lang, false).format(value);
}

/** Like formatNumber but always shows the sign (except for zero), using the locale's own sign marks. */
export function formatSigned(value: number, lang: string): string {
  return formatterFor(lang, true).format(value);
}
