import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEVELS as allLevels } from '@/game/content';
import { compareKey, normalizeWord } from '@/services/customData';
import type { LearningIndex, LearningPack } from '@/services/learningPacks';

const root = join(__dirname, '../../src/packs');
const MIN_WORDS_PER_DIFFICULTY = 10;

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const langsWithLearning = readdirSync(root).filter((l) => existsSync(join(root, l, 'learning')));

describe.each(langsWithLearning)('learning packs (%s)', (lang) => {
  const dir = join(root, lang, 'learning');
  const index = readJson<LearningIndex>(join(dir, 'index.json'));
  const levelDirs = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const files = levelDirs.flatMap((level) =>
    readdirSync(join(dir, level))
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        level,
        id: f.replace(/\.json$/, ''),
        pack: readJson<LearningPack>(join(dir, level, f)),
      })),
  );

  it('uses only known level folders', () => {
    for (const level of levelDirs) expect(allLevels as readonly string[]).toContain(level);
  });

  it('has an index for this language', () => {
    expect(index.lang).toBe(lang);
    expect(index.schema).toBe(1);
  });

  it('lists in the index exactly the files that exist', () => {
    const fromIndex = index.categories
      .flatMap((c) => c.levels.map((level) => `${level}/${c.id}`))
      .sort();
    expect(fromIndex).toEqual(files.map((f) => `${f.level}/${f.id}`).sort());
  });

  it('has an index with unique category ids and names', () => {
    const ids = index.categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of index.categories) expect(c.name.trim()).not.toBe('');
  });

  describe.each(files.map((f) => [`${f.level}/${f.id}`, f] as const))('%s', (_name, f) => {
    const { pack } = f;

    it('has a header that matches its place', () => {
      expect(pack.id).toBe(f.id);
      expect(pack.lang).toBe(lang);
      expect(pack.level).toBe(f.level);
    });

    it('has only difficulties 1 to 3, each with enough valid words', () => {
      expect(Object.keys(pack.words).sort()).toEqual(['1', '2', '3']);
      for (const d of ['1', '2', '3']) {
        const list = pack.words[d]!;
        expect(list.length, `difficulty ${d}`).toBeGreaterThanOrEqual(MIN_WORDS_PER_DIFFICULTY);
        for (const w of list) expect(normalizeWord(w), `"${w}" is not a valid word`).toBe(w);
      }
    });

    it('has no repeated word in the file', () => {
      const keys = Object.values(pack.words).flat().map(compareKey);
      expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    });

    it('has hints and glosses only for words of the file, none empty', () => {
      const keys = new Set(Object.values(pack.words).flat().map(compareKey));
      const check = (entries: Record<string, string>, what: string) => {
        for (const [word, text] of Object.entries(entries)) {
          expect(keys.has(compareKey(word)), `${what} for unknown word "${word}"`).toBe(true);
          expect(text.trim(), `${what} for "${word}" is empty`).not.toBe('');
        }
      };
      if (pack.hints) check(pack.hints, 'hint');
      for (const [appLang, entries] of Object.entries(pack.glosses ?? {})) {
        check(entries, `${appLang} gloss`);
      }
    });
  });

  it('has no word at two levels of one category', () => {
    for (const c of index.categories) {
      const seen = new Map<string, string>();
      for (const f of files.filter((x) => x.id === c.id)) {
        for (const w of Object.values(f.pack.words).flat()) {
          const key = compareKey(w);
          expect(seen.get(key), `"${w}" is at ${seen.get(key)} and ${f.level} in ${c.id}`).toBeUndefined();
          seen.set(key, f.level);
        }
      }
    }
  });
});
