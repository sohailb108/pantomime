import { getLanguage } from '@/i18n/languages';

/** Formats a number with the language's numbering system (display only). */
export function formatNumber(value: number, lang: string): string {
  return new Intl.NumberFormat(`${lang}-u-nu-${getLanguage(lang).numerals}`).format(value);
}

/** Like formatNumber but always shows the sign (except for zero), using the locale's own sign marks. */
export function formatSigned(value: number, lang: string): string {
  return new Intl.NumberFormat(`${lang}-u-nu-${getLanguage(lang).numerals}`, {
    signDisplay: 'exceptZero',
  }).format(value);
}
