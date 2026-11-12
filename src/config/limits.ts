/** Words longer than this are shown in a smaller font so they fit on a phone screen. */
export const LONG_WORD = 24;

/** CSS class for a word card: `long-word` shrinks the text of long words. */
export function longWordClass(word: string | null | undefined): Record<string, boolean> {
  return { 'long-word': (word ?? '').length > LONG_WORD };
}
