import { describe, expect, it } from 'vitest';
import messages from '@/i18n';

type Tree = Record<string, unknown>;

function leaves(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix + k;
    if (v && typeof v === 'object') {
      for (const [p, s] of leaves(v as Tree, path + '.')) out.set(p, s);
    } else out.set(path, String(v));
  }
  return out;
}

const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

describe('translations', () => {
  const en = leaves(messages.en);
  const fa = leaves(messages.fa);

  it('have the same keys in every language', () => {
    expect([...fa.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it('have no empty strings', () => {
    for (const [lang, map] of [['en', en], ['fa', fa]] as const)
      for (const [key, value] of map) expect(value.trim(), `${lang}:${key}`).not.toBe('');
  });

  it('use the same placeholders in every language', () => {
    for (const [key, value] of en) {
      expect(placeholders(fa.get(key) ?? ''), key).toEqual(placeholders(value));
    }
  });
});
