// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import messages from '@/i18n';
import BoardPage from '@/pages/BoardPage.vue';
import { useCustomStore } from '@/stores/custom';
import { useGameStore } from '@/stores/game';
import { builtinGoldWords } from '@/services/words';
import { useSettingsStore } from '@/stores/settings';
import { playAllTiles, playTiles, startGame } from '../helpers/game';
import { hasButton, mountPage, press } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

const en = messages.en;

async function openBoard(prepare: (game: ReturnType<typeof startGame>) => void = () => undefined) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  const game = startGame();
  prepare(game);
  const mounted = await mountPage('/board', BoardPage, pinia);
  return { ...mounted, game };
}

describe('BoardPage', () => {
  beforeEach(() => void stubLocalStorage());
  afterEach(() => void (document.body.innerHTML = ''));

  it('shows a tile for every category and difficulty, and whose turn it is', async () => {
    const { wrapper, game } = await openBoard();
    expect(wrapper.findAll('.tile')).toHaveLength(game.state!.tiles.length);
    expect(wrapper.findAll('.board-row')).toHaveLength(2);
    expect(wrapper.text()).toContain('Animals');
    expect(wrapper.find('.turn-pill').exists()).toBe(true);
    expect(wrapper.findAll('.score-card')).toHaveLength(2);
  });

  it('picks a tile and goes to the turn page', async () => {
    const { wrapper, game, router } = await openBoard();
    await wrapper.findAll('.tile')[0]!.trigger('click');
    await flushPromises();
    expect(game.pickedTile).toBe(0);
    expect(router.currentRoute.value.path).toBe('/turn');
  });

  it('shows played tiles with their points and does not let them be picked again', async () => {
    const { wrapper, game, router } = await openBoard((g) => playTiles(g, 1, 4));
    const tile = wrapper.findAll('.tile')[0]!;
    expect(tile.classes()).toContain('played');
    expect(tile.text()).toContain('+4');
    game.pick(null);
    await tile.trigger('click');
    expect(game.pickedTile).toBeNull();
    expect(router.currentRoute.value.path).toBe('/board');
  });

  it('shows the played tile of a stolen tile with the stealer', async () => {
    const { wrapper } = await openBoard((g) => {
      g.pick(0);
      g.finish([
        { teamId: g.state!.currentTeam, points: -1 },
        { teamId: 1 - g.state!.currentTeam, points: 2 },
      ]);
    });
    expect(wrapper.find('.tile.played').exists()).toBe(true);
  });

  it('announces who goes first until the card is dismissed', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useSettingsStore().language = 'en';
    const game = startGame();
    game.state!.startRevealed = false;
    const { wrapper } = await mountPage('/board', BoardPage, pinia);
    expect(document.body.textContent).toContain(en.board.firstTitle);
    const ok = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent === en.board.firstOk,
    )!;
    ok.click();
    await flushPromises();
    expect(game.state!.startRevealed).toBe(true);
    expect(wrapper.exists()).toBe(true);
  });

  describe('gold round', () => {
    it('offers the attempt instead of the turn pill and blocks the tiles', async () => {
      const { wrapper, game, router } = await openBoard(playAllTiles);
      expect(game.state!.status).toBe('gold');
      expect(wrapper.find('.gold-offer').exists()).toBe(true);
      expect(wrapper.find('.turn-pill').exists()).toBe(false);
      await wrapper.findAll('.tile')[0]!.trigger('click');
      expect(game.pickedTile).toBeNull();
      expect(router.currentRoute.value.path).toBe('/board');
    });

    it('goes to the gold page on Start', async () => {
      const { wrapper, router } = await openBoard(playAllTiles);
      await press(wrapper, en.turn.start);
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/gold');
    });

    it('records a decline, offers the next team, and ends at the results', async () => {
      const { wrapper, game, router } = await openBoard(playAllTiles);
      await press(wrapper, en.gold.decline);
      expect(game.state!.goldResults).toHaveLength(1);
      if (game.state!.status === 'gold') {
        await flushPromises();
        await press(wrapper, en.gold.decline);
      }
      await flushPromises();
      expect(game.state!.status).toBe('finished');
      expect(router.currentRoute.value.path).toBe('/results');
      expect(game.state!.goldResults.every((r) => r.outcome === 'declined')).toBe(true);
    });

    it('only lets the team keep its points when every gold word is hidden', async () => {
      const { wrapper } = await openBoard(() => {
        const custom = useCustomStore();
        for (const w of builtinGoldWords('en')) custom.hideGold('en', w);
        playAllTiles(useGameStore());
      });
      const start = wrapper.findAll('button').find((b) => b.text() === en.turn.start)!;
      expect(start.attributes('disabled')).toBeDefined();
      expect(wrapper.text()).toContain(en.gold.noWords);
      expect(hasButton(wrapper, en.gold.decline)).toBe(true);
    });
  });

  describe('finished game', () => {
    it('links back to the results, shows gold outcomes and has no turn pill', async () => {
      const { wrapper, game } = await openBoard((g) => {
        playAllTiles(g);
        while (g.state!.status === 'gold') g.declineGold();
      });
      expect(game.state!.status).toBe('finished');
      expect(wrapper.find(`[aria-label="${en.board.back}"]`).exists()).toBe(true);
      expect(wrapper.find('.turn-pill').exists()).toBe(false);
      expect(wrapper.find('.gold-results').text()).toContain(en.gold.result.declined);
      expect(hasButton(wrapper, en.gold.decline)).toBe(false);
    });
  });
});
