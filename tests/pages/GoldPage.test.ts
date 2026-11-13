// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import GoldPage from '@/pages/GoldPage.vue';
import { useSettingsStore } from '@/stores/settings';
import { playAllTiles, startGame } from '../helpers/game';
import { hasButton, mountPage, press } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

vi.mock('@/services/feedback', () => ({ cue: vi.fn(), timerCue: () => null }));

const en = messages.en;

/** Opens the gold page for a game whose normal play is over, with a fixed deck. */
async function openGold(options: { deck?: string[]; played?: boolean } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  const game = startGame();
  if (options.played !== false) playAllTiles(game);
  vi.spyOn(game, 'goldDeck').mockReturnValue(options.deck ?? ['rocket', 'volcano']);
  const mounted = await mountPage('/gold', GoldPage, pinia);
  return { ...mounted, game };
}

describe('GoldPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubLocalStorage();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('hides the word until the actor taps Show the word', async () => {
    const { wrapper } = await openGold();
    expect(wrapper.text()).not.toContain('rocket');
    await press(wrapper, en.turn.showWord);
    expect(wrapper.text()).toContain('rocket');
    expect(wrapper.text()).toContain(en.turn.start);
  });

  it('marks the shown word as seen', async () => {
    const { wrapper } = await openGold();
    await press(wrapper, en.turn.showWord);
    await flushPromises();
    const saved = JSON.parse(localStorage.getItem('pantomime:history')!) as {
      data: Record<string, Record<string, string[]>>;
    };
    expect(saved.data.en!.gold).toEqual(['rocket']);
  });

  it('scores a guessed word, shows the result, and continues to the next team', async () => {
    const { wrapper, game, router } = await openGold();
    const team = game.state!.goldQueue[0]!;
    const before = game.state!.teams[team]!.score;
    await press(wrapper, en.turn.showWord);
    await press(wrapper, en.turn.start);
    await press(wrapper, en.turn.guessed);
    expect(game.state!.teams[team]!.score).toBe(before + game.state!.settings.gold.bonus);
    expect(wrapper.text()).toContain('rocket');
    await press(wrapper, en.turn.next);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/board');
  });

  it('charges the penalty when the team gives up, after a second tap', async () => {
    const { wrapper, game } = await openGold();
    const team = game.state!.goldQueue[0]!;
    const before = game.state!.teams[team]!.score;
    await press(wrapper, en.turn.showWord);
    await press(wrapper, en.turn.start);
    await press(wrapper, en.turn.giveUp);
    expect(game.state!.teams[team]!.score).toBe(before);
    await press(wrapper, en.turn.giveUpConfirm);
    expect(game.state!.teams[team]!.score).toBe(before - game.state!.settings.gold.penalty);
  });

  it('counts as failed when time runs out', async () => {
    const { wrapper, game } = await openGold();
    const team = game.state!.goldQueue[0]!;
    const before = game.state!.teams[team]!.score;
    await press(wrapper, en.turn.showWord);
    await press(wrapper, en.turn.start);
    await vi.advanceTimersByTimeAsync(game.state!.settings.gold.timerSeconds * 1000 + 500);
    expect(game.state!.teams[team]!.score).toBe(before - game.state!.settings.gold.penalty);
    expect(hasButton(wrapper, en.turn.next)).toBe(true);
  });

  it('goes to the results after the last attempt', async () => {
    const { wrapper, game, router } = await openGold();
    // Resolve every attempt but the last one directly, then play the last on the page.
    while (game.state!.goldQueue.length > 1) game.declineGold();
    await press(wrapper, en.turn.showWord);
    await press(wrapper, en.turn.start);
    await press(wrapper, en.turn.guessed);
    expect(game.state!.status).toBe('finished');
    await press(wrapper, en.turn.next);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/results');
  });

  it('asks before leaving mid-attempt and keeps the game at the gold round', async () => {
    const { wrapper, game, router } = await openGold();
    await press(wrapper, en.turn.showWord);
    await wrapper.find(`[aria-label="${en.leave.button}"]`).trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain(en.leave.goldTitle);
    expect(game.state!.status).toBe('gold');
    expect(router.currentRoute.value.path).toBe('/gold');
  });

  it('goes back to the board without a gold word to show', async () => {
    const { router } = await openGold({ deck: [] });
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/board');
  });

  it('redirects away when the game is not in the gold round', async () => {
    const { router } = await openGold({ played: false });
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');
  });
});
