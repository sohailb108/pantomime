import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareKey, normalizeWord } from '@/services/customData';

const root = join(__dirname, '../../src/packs');
const langs = readdirSync(root);

interface Index {
  schema: number;
  lang: string;
  categories: { id: string; name: string }[];
}
interface Pack {
  id: string;
  lang: string;
  words: Record<string, string[]>;
}

const read = <T>(lang: string, file: string): T =>
  JSON.parse(readFileSync(join(root, lang, `${file}.json`), 'utf8')) as T;

function checkWords(words: string[]) {
  expect(words.length).toBeGreaterThan(0);
  for (const w of words) expect(normalizeWord(w), `"${w}" is not a valid word`).toBe(w);
  const keys = words.map(compareKey);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  expect(dupes, 'duplicate words').toEqual([]);
}

describe('built-in packs', () => {
  it('has the same category ids in every language', () => {
    const ids = langs.map((l) => read<Index>(l, 'index').categories.map((c) => c.id).sort());
    for (const list of ids) expect(list).toEqual(ids[0]);
  });

  for (const lang of langs) {
    describe(lang, () => {
      const index = read<Index>(lang, 'index');

      it('has an index that matches its folder', () => {
        expect(index.lang).toBe(lang);
        expect(new Set(index.categories.map((c) => c.id)).size).toBe(index.categories.length);
        expect(new Set(index.categories.map((c) => c.name)).size).toBe(index.categories.length);
      });

      it('has a file for every category and no unlisted files', () => {
        const files = readdirSync(join(root, lang))
          .map((f) => f.replace(/\.json$/, ''))
          .filter((f) => f !== 'index' && f !== 'gold')
          .sort();
        expect(files).toEqual(index.categories.map((c) => c.id).sort());
      });

      for (const { id, name } of index.categories) {
        it(`category ${id} has valid words at every difficulty`, () => {
          const pack = read<Pack>(lang, id);
          expect(pack.id).toBe(id);
          expect(pack.lang).toBe(lang);
          expect(Object.keys(pack.words).sort()).toEqual(['1', '2', '3']);
          expect((pack as unknown as { name: string }).name).toBe(name);
          for (const d of ['1', '2', '3']) checkWords(pack.words[d]!);
          // A word at two difficulties would be drawn twice in one game.
          const all = ['1', '2', '3'].flatMap((d) => pack.words[d]!.map(compareKey));
          expect(new Set(all).size).toBe(all.length);
        });
      }

      it('has gold words', () => {
        const gold = read<{ lang: string; words: string[] }>(lang, 'gold');
        expect(gold.lang).toBe(lang);
        checkWords(gold.words);
      });
    });
  }
});
