/** Texts longer than this are shown in a smaller font so they fit on a phone screen. */
export const LONG_WORD = 24;

/** Length of the longest word of a text (words are split at spaces), at least 1. */
export function longestWordLength(text: string): number {
  return Math.max(1, ...text.split(/\s+/).map((w) => [...w].length));
}

/**
 * Attributes for the element that shows a word (use as `v-bind`). The `fit-word` class sizes the text
 * from `--word-chars`, the longest word, so a single long word shrinks to fit instead of breaking
 * mid-word (see app.scss). `long-word` is for long phrases. `lang` is the word's language, which
 * lets the browser hyphenate a word that is too long even at the smallest size.
 */
export function wordFit(word: string | null | undefined, lang: string) {
  const text = word ?? '';
  return {
    class: ['fit-word', { 'long-word': [...text].length > LONG_WORD }],
    style: { '--word-chars': longestWordLength(text) },
    lang,
  };
}
