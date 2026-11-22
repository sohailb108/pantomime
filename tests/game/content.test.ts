import { describe, expect, it } from 'vitest';
import { historyNamespace, normalContent, readContent, sortLevels } from '@/game/content';

describe('content', () => {
  it('keeps the plain language code as history key for normal packs', () => {
    expect(historyNamespace(normalContent('de'))).toBe('de');
  });

  it('adds the sorted level set for learning packs', () => {
    const a = { lang: 'de', kind: 'learning' as const, levels: ['a2' as const, 'a1' as const] };
    expect(historyNamespace(a)).toBe('de:learning:a1+a2');
    expect(historyNamespace({ ...a, levels: ['a1'] })).toBe('de:learning:a1');
    expect(historyNamespace({ ...a, levels: ['a1', 'a2', 'b1'] })).not.toBe(historyNamespace(a));
  });

  it('reads a save without content as normal content', () => {
    expect(readContent(undefined, 'fa')).toEqual(normalContent('fa'));
    expect(readContent({ lang: 'de', kind: 'learning', levels: ['b1', 'a1', 'x'] }, 'fa')).toEqual({
      lang: 'de',
      kind: 'learning',
      levels: ['a1', 'b1'],
    });
    expect(readContent({ lang: 'de', kind: 'learning', levels: [] }, 'fa')).toEqual(normalContent('de'));
  });

  it('sorts levels in CEFR order and drops unknown ones', () => {
    expect(sortLevels(['b1', 'a1', 'zz', 'a1'])).toEqual(['a1', 'b1']);
  });
});
