import { describe, expect, it } from 'vitest';
import { LONG_WORD, longestWordLength, wordFit } from '@/config/limits';

describe('longestWordLength', () => {
  it('measures the longest word of a text', () => {
    expect(longestWordLength('Dinosaurier')).toBe(11);
    expect(longestWordLength('Schwarzwälder Kirschtorte')).toBe(13);
    expect(longestWordLength('a  bb   ccc')).toBe(3);
  });

  it('is at least 1, also for an empty text', () => {
    expect(longestWordLength('')).toBe(1);
  });
});

describe('wordFit', () => {
  it('passes the longest word, the language and a class that fits the text', () => {
    const fit = wordFit('Dinosaurier', 'de');
    expect(fit.style['--word-chars']).toBe(11);
    expect(fit.lang).toBe('de');
    expect(fit.class).toEqual(['fit-word', { 'long-word': false }]);
  });

  it('marks a long phrase, but not one of exactly the limit', () => {
    expect(wordFit('x'.repeat(LONG_WORD), 'en').class[1]).toEqual({ 'long-word': false });
    expect(wordFit('x '.repeat(LONG_WORD), 'en').class[1]).toEqual({ 'long-word': true });
  });

  it('copes with no word', () => {
    expect(wordFit(null, 'en').style['--word-chars']).toBe(1);
  });
});
