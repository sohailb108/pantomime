// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import GoldPage from '@/pages/GoldPage.vue';
import { builtinGoldWords } from '@/services/words';
import { useCustomStore } from '@/stores/custom';
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

  /** Taps a button whose label is `text`; the icon name is part of the button's text. */
  async function tap(wrapper: Awaited<ReturnType<typeof openGold>>['wrapper'], text: string) {
    const button = wrapper.findAll('button').find((b) => b.text().endsWith(text));
    if (!button) throw new Error(`No button "${text}". Page shows: ${wrapper.text()}`);
    await button.trigger('click');
  }
  async function reachResult(wrapper: Awaited<ReturnType<typeof openGold>>['wrapper']) {
    await press(wrapper, en.turn.showWord);
    await press(wrapper, en.turn.start);
    await press(wrapper, en.turn.guessed);
  }

  it('hides a built-in word from the gold result screen, and can undo it', async () => {
    const word = builtinGoldWords('en')[0]!;
    const { wrapper } = await openGold({ deck: [word] });
    const custom = useCustomStore();
    await reachResult(wrapper);
    await tap(wrapper, en.turn.hideWord);
    expect(custom.hiddenGold('en')).toEqual([word]);
    expect(wrapper.text()).toContain(en.turn.statusHidden);
    await tap(wrapper, en.turn.undoChange);
    expect(custom.hiddenGold('en')).toEqual([]);
  });

  it('hiding a custom gold word removes it, and undo adds it back', async () => {
    const { wrapper } = await openGold({ deck: ['zzcustom'] });
    const custom = useCustomStore();
    custom.addGold('en', 'zzcustom');
    await reachResult(wrapper);
    await tap(wrapper, en.turn.hideWord);
    expect(custom.goldWords('en')).toEqual([]);
    await tap(wrapper, en.turn.undoChange);
    expect(custom.goldWords('en')).toEqual(['zzcustom']);
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
