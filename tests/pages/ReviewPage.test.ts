// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import { normalContent } from '@/game/content';
import type { TurnWord } from '@/game/types';
import messages from '@/i18n';
import ResultsPage from '@/pages/ResultsPage.vue';
import ReviewPage from '@/pages/ReviewPage.vue';
import type * as learningPacks from '@/services/learningPacks';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { mountPage } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

vi.mock('@/services/learningPacks', async () => {
  const actual = await vi.importActual<Pick<typeof learningPacks, 'createLearningPacks'>>('@/services/learningPacks');
  const { learningFiles, learningIndexes } = await import('../fixtures/learning');
  return actual.createLearningPacks(learningFiles, learningIndexes);
});

const en = messages.en;

/** A finished two-team game in the food and animals categories, the first turn showing `words`. */
function finishedGame(kind: 'learning' | 'normal', words: TurnWord[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  const game = useGameStore();
  const settings = structuredClone(DEFAULT_GAME_SETTINGS);
  settings.gold.enabled = false;
  game.start({
    teamColors: ['red', 'blue'],
    categoryIds: ['food', 'animals'],
    mode: 'multi',
    settings,
    content: kind === 'learning' ? { lang: 'de', kind, levels: ['a1'] } : normalContent('en'),
  });
  game.revealStart();
  game.state!.currentTeam = 0;
  game.pick(0);
  game.finish([], words);
  while (game.state!.tiles.some((t) => t.playedBy === undefined)) {
    game.pick(game.state!.tiles.findIndex((t) => t.playedBy === undefined));
    game.finish([]);
  }
  return pinia;
}

const words: TurnWord[] = [
  { word: 'Brot', outcome: 'guessed', hinted: false },
  { word: 'Gabel', outcome: 'failed', hinted: true },
  { word: 'Apfel', outcome: 'skipped', hinted: false },
];

describe('ReviewPage', () => {
  beforeEach(() => void stubLocalStorage());
  afterEach(() => void (document.body.innerHTML = ''));

  it('lists the words with their translation, outcome and hint', async () => {
    const { wrapper } = await mountPage('/review', ReviewPage, finishedGame('learning', words));
    const rows = wrapper.findAll('.review-word');
    expect(rows.map((r) => r.find('.word').text())).toEqual(['Brot', 'Gabel', 'Apfel']);
    expect(rows[0]!.find('.translation').text()).toBe('bread');
    expect(rows[1]!.find('.translation').text()).toBe('fork / pitchfork');
    expect(rows[2]!.find('.translation').exists()).toBe(false); // no translation in the pack
    expect(rows[0]!.text()).toContain(en.review.outcome.guessed);
    expect(rows[1]!.text()).toContain(en.review.outcome.failed);
    expect(rows[1]!.text()).toContain(en.review.hinted);
    expect(rows[0]!.text()).not.toContain(en.review.hinted);
    // Brot and Gabel are in food, Apfel too: one category card.
    expect(wrapper.findAll('.soft-card')).toHaveLength(1);
  });

  it('leaves a game that is not a Learning game', async () => {
    const { router } = await mountPage('/review', ReviewPage, finishedGame('normal', words));
    expect(router.currentRoute.value.path).toBe('/results');
  });

  it('is offered from the results of a Learning game with words only', async () => {
    const withWords = await mountPage('/results', ResultsPage, finishedGame('learning', words));
    expect(withWords.wrapper.text()).toContain(en.results.review);
    document.body.innerHTML = '';
    const normal = await mountPage('/results', ResultsPage, finishedGame('normal', words));
    expect(normal.wrapper.text()).not.toContain(en.results.review);
  });
});
