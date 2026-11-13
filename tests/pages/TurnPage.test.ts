// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import * as Quasar from 'quasar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { DEFAULT_GAME_SETTINGS } from '@/config/defaults';
import messages from '@/i18n';
import TurnPage from '@/pages/TurnPage.vue';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import type { Mode } from '@/game/types';

const en = messages.en.turn;

vi.mock('@/services/feedback', () => ({ cue: vi.fn(), timerCue: () => null }));

const qComponents = Object.fromEntries(Object.entries(Quasar).filter(([k]) => /^Q[A-Z]/.test(k)));

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

/** Mounts the turn page for the first tile of a new game, with a fixed deck of words. */
async function openTurn(mode: Mode, deck: string[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  const game = useGameStore();
  game.start({
    teamColors: ['red', 'blue'],
    categoryIds: ['animals', 'movies'],
    mode,
    settings: structuredClone(DEFAULT_GAME_SETTINGS),
    lang: 'en',
  });
  game.pick(0);
  vi.spyOn(game, 'tileDeck').mockReturnValue([...deck]);

  const stub = (name: string) => defineComponent({ name, render: () => h('div', name) });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: stub('home') },
      { path: '/board', component: stub('board') },
      { path: '/results', component: stub('results') },
      { path: '/turn', component: TurnPage },
    ],
  });
  await router.push('/turn');
  const wrapper = mount(
    {
      // QPage only renders inside a layout.
      render: () => h(Quasar.QLayout, () => h(Quasar.QPageContainer, () => h(RouterView))),
    },
    {
      attachTo: document.body,
      global: {
        plugins: [
          pinia,
          router,
          [Quasar.Quasar, { components: qComponents, directives: { ClosePopup: Quasar.ClosePopup } }],
          createI18n({ legacy: false, locale: 'en', messages }),
        ],
      },
    },
  );
  await flushPromises();
  return { wrapper, game, router };
}

/** Clicks the button whose label is exactly `text`. */
async function press(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`No button "${text}". Page shows: ${wrapper.text()}`);
  await button.trigger('click');
}
/** Score of the team that played the turn (who starts is random). */
const scoreOf = (game: ReturnType<typeof useGameStore>, team: number) => game.state!.teams[team]!.score;
const hasButton = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').some((b) => b.text() === text);

describe('TurnPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', memoryStorage());
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('multi-word mode', () => {
    /** Starts the turn and waits out the get-ready countdown. */
    async function play(deck: string[]) {
      const t = await openTurn('multi', deck);
      await press(t.wrapper, en.startTurn);
      await vi.advanceTimersByTimeAsync(3100);
      return t;
    }

    it('shows the first word once the get-ready countdown is over', async () => {
      const { wrapper } = await openTurn('multi', ['alpha', 'beta']);
      await press(wrapper, en.startTurn);
      expect(wrapper.text()).not.toContain('alpha');
      await vi.advanceTimersByTimeAsync(3100);
      expect(wrapper.text()).toContain('alpha');
    });

    it('draws the next word on Correct and takes it back with Undo last', async () => {
      const { wrapper } = await play(['alpha', 'beta', 'gamma']);
      await press(wrapper, en.correct);
      expect(wrapper.text()).toContain('beta');
      expect(wrapper.text()).toContain('1 correct');
      await press(wrapper, en.undoLast);
      expect(wrapper.text()).toContain('alpha');
      expect(wrapper.text()).toContain('0 correct');
    });

    it('ends the turn and scores the word when Correct is tapped on the last word', async () => {
      const { wrapper, game } = await play(['alpha']);
      const team = game.state!.currentTeam;
      await press(wrapper, en.correct);
      expect(wrapper.text()).toContain(en.resultTitle);
      expect(wrapper.text()).toContain(en.noMoreWords);
      await press(wrapper, en.next);
      await flushPromises();
      expect(scoreOf(game, team)).toBe(game.state!.settings.points[game.state!.tiles[0]!.difficulty]);
    });

    it('ends the turn without charging a skip when Skip finds no replacement word', async () => {
      const { wrapper, game } = await play(['alpha']);
      const team = game.state!.currentTeam;
      await press(wrapper, en.skip);
      expect(wrapper.text()).toContain(en.noMoreWords);
      expect(wrapper.text()).toContain(en.noPoints);
      await press(wrapper, en.next);
      await flushPromises();
      expect(scoreOf(game, team)).toBe(0);
    });

    it('ends the turn at once when the category has no words', async () => {
      const { wrapper } = await openTurn('multi', []);
      await press(wrapper, en.startTurn);
      await vi.advanceTimersByTimeAsync(3100);
      expect(wrapper.text()).toContain(en.noMoreWords);
      expect(hasButton(wrapper, en.next)).toBe(true);
    });

    it('lets the judge finish the last word after time is up, and undo that', async () => {
      const { wrapper } = await play(['alpha', 'beta']);
      await vi.advanceTimersByTimeAsync(61_000);
      expect(wrapper.text()).toContain(en.finishWord);
      await press(wrapper, en.correct);
      expect(wrapper.text()).toContain(en.resultTitle);
      await press(wrapper, en.undo);
      expect(wrapper.text()).toContain(en.finishWord);
    });
  });

  describe('single-word mode', () => {
    it('plays a guessed turn and scores the tile', async () => {
      const { wrapper, game, router } = await openTurn('single', ['alpha', 'beta']);
      const team = game.state!.currentTeam;
      await press(wrapper, en.showWord);
      expect(wrapper.text()).toContain('alpha');
      await press(wrapper, en.start);
      await press(wrapper, en.guessed);
      expect(wrapper.text()).toContain(en.resultTitle);
      await press(wrapper, en.next);
      await flushPromises();
      expect(scoreOf(game, team)).toBeGreaterThan(0);
      expect(game.state!.tiles[0]!.playedBy).toBe(team);
      expect(router.currentRoute.value.path).toBe('/board');
    });

    it('goes straight to the result when the category has no words', async () => {
      const { wrapper } = await openTurn('single', []);
      await press(wrapper, en.showWord);
      expect(wrapper.text()).toContain(en.noMoreWords);
      expect(hasButton(wrapper, en.next)).toBe(true);
    });

    it('offers a steal after giving up, and undo returns to the running turn', async () => {
      const { wrapper } = await openTurn('single', ['alpha']);
      await press(wrapper, en.showWord);
      await press(wrapper, en.start);
      await press(wrapper, en.giveUp);
      await press(wrapper, en.giveUpConfirm);
      expect(hasButton(wrapper, en.stealRight)).toBe(true);
      await press(wrapper, en.undo);
      expect(hasButton(wrapper, en.guessed)).toBe(true);
    });

    it('cannot undo past a timeout', async () => {
      const { wrapper } = await openTurn('single', ['alpha']);
      await press(wrapper, en.showWord);
      await press(wrapper, en.start);
      await vi.advanceTimersByTimeAsync(31_000);
      expect(hasButton(wrapper, en.stealRight)).toBe(true);
      expect(hasButton(wrapper, en.undo)).toBe(false);
    });
  });
});
