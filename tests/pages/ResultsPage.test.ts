// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import messages from '@/i18n';
import ResultsPage from '@/pages/ResultsPage.vue';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { playAllTiles, startGame } from '../helpers/game';
import { mountPage } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

const en = messages.en;

async function openResults(prepare: (game: ReturnType<typeof startGame>) => void) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  prepare(startGame({ teams: ['red', 'blue'] }));
  const mounted = await mountPage('/results', ResultsPage, pinia);
  return { ...mounted, game: useGameStore() };
}

/** Finishes the game with team 0 clearly ahead. */
function finishWithWinner(game: ReturnType<typeof startGame>) {
  game.state!.currentTeam = 0;
  game.pick(0);
  game.finish([{ teamId: 0, points: 50 }]);
  while (game.state!.tiles.some((t) => t.playedBy === undefined)) {
    game.pick(game.state!.tiles.findIndex((t) => t.playedBy === undefined));
    game.finish([]);
  }
  while (game.state!.status === 'gold') game.declineGold();
}

describe('ResultsPage', () => {
  beforeEach(() => void stubLocalStorage());
  afterEach(() => void (document.body.innerHTML = ''));

  it('names the winner and ranks the teams by score', async () => {
    const { wrapper, game } = await openResults(finishWithWinner);
    const winner = game.state!.teams[0]!;
    expect(wrapper.find('.winner-pill').text()).toBe(
      en.results.winner.replace('{team}', en.teamColors[winner.color as keyof typeof en.teamColors]),
    );
    const cards = wrapper.findAll('.rank-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]!.classes()).toContain('winner');
    expect(cards[0]!.find('.score').text()).toBe('50');
    expect(cards[1]!.find('.rank-badge').text()).toBe('2');
  });

  it('shows a tie when the top teams have the same score', async () => {
    const { wrapper } = await openResults((game) => {
      playAllTiles(game);
      while (game.state!.status === 'gold') game.declineGold();
    });
    expect(wrapper.find('.winner-pill').text()).toBe(en.results.tie);
    expect(wrapper.findAll('.rank-card.winner')).toHaveLength(2);
  });

  it('links to a new game, the board and home', async () => {
    const { wrapper } = await openResults(finishWithWinner);
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/setup', '/board', '/']));
  });

  it('sends a game still being played back to the board', async () => {
    const { router } = await openResults(() => undefined);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/board');
  });

  it('sends visitors without a game home', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { router } = await mountPage('/results', ResultsPage, pinia);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');
  });
});
