import type { LearningIndex, LearningPack } from '@/services/learningPacks';

const words = (a: string[], b: string[], c: string[]) => ({ '1': a, '2': b, '3': c });
const pack = (level: LearningPack['level'], id: string, w: LearningPack['words'], hints?: LearningPack['hints'], glosses?: LearningPack['glosses']) =>
  [`/src/packs/de/learning/${level}/${id}.json`, { id, lang: 'de', level, words: w, ...(hints ? { hints } : {}), ...(glosses ? { glosses } : {}) }] as const;

/** Small learning packs for tests: food at A1 and A2 (sharing no word), animals at A1 only, sport at A2 with no difficulty 3. */
export const learningFiles: Record<string, LearningPack> = Object.fromEntries([
  pack('a1', 'food', words(['Brot', 'Apfel'], ['Suppe'], ['Gabel']), { Suppe: 'Löffel' }, {
    en: { Brot: 'bread', Gabel: 'fork / pitchfork' },
    fa: { Brot: 'نان' },
  }),
  pack('a2', 'food', words(['Käse', 'brot'], ['Nudel'], ['Messer']), { Käse: 'Schneiden' }, { en: { Käse: 'cheese', Nudel: '' } }),
  pack('a1', 'animals', words(['Hund'], ['Katze'], ['Pferd'])),
  pack('a2', 'sport', words(['Ball'], ['Lauf'], [])),
]);

export const learningIndexes: Record<string, LearningIndex> = {
  '/src/packs/de/learning/index.json': {
    schema: 1,
    lang: 'de',
    categories: [
      { id: 'food', name: 'Essen', levels: ['a1', 'a2'] },
      { id: 'animals', name: 'Tiere', levels: ['a1'] },
      { id: 'sport', name: 'Sport', levels: ['a2'] },
    ],
  },
};
