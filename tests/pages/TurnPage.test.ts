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
import { builtinWords, getPool } from '@/services/words';
import { useCustomStore } from '@/stores/custom';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import type { Difficulty, Mode } from '@/game/types';

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
async function openTurn(mode: Mode, deckOf: string[] | ((game: ReturnType<typeof useGameStore>) => string[])) {
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
  const deck = typeof deckOf === 'function' ? deckOf(game) : deckOf;
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

    it('undoes a right steal and then the give-up, one step at a time', async () => {
      const { wrapper } = await openTurn('single', ['alpha']);
      await press(wrapper, en.showWord);
      await press(wrapper, en.start);
      await press(wrapper, en.giveUp);
      await press(wrapper, en.giveUpConfirm);
      await press(wrapper, en.stealRight);
      expect(wrapper.text()).toContain(en.resultTitle);
      await press(wrapper, en.undo);
      expect(hasButton(wrapper, en.stealRight)).toBe(true);
      await press(wrapper, en.undo);
      expect(hasButton(wrapper, en.guessed)).toBe(true);
      expect(hasButton(wrapper, en.undo)).toBe(false);
    });

    it('can undo a steal after a timeout, but no further', async () => {
      const { wrapper } = await openTurn('single', ['alpha']);
      await press(wrapper, en.showWord);
      await press(wrapper, en.start);
      await vi.advanceTimersByTimeAsync(31_000);
      await press(wrapper, en.stealWrong);
      await press(wrapper, en.undo);
      expect(hasButton(wrapper, en.stealRight)).toBe(true);
      expect(hasButton(wrapper, en.undo)).toBe(false);
    });

    it('takes back a guess after a reroll without losing the reroll penalty', async () => {
      /** Plays one turn with a reroll and a guess, optionally undoing the guess first. */
      async function turn(withUndo: boolean) {
        const { wrapper, game } = await openTurn('single', ['alpha', 'beta']);
        const team = game.state!.currentTeam;
        await press(wrapper, en.showWord);
        const reroll = wrapper.findAll('button').find((b) => b.text().includes('Change word'));
        await reroll!.trigger('click');
        await press(wrapper, en.start);
        await press(wrapper, en.guessed);
        if (withUndo) {
          await press(wrapper, en.undo);
          await press(wrapper, en.guessed);
        }
        await press(wrapper, en.next);
        await flushPromises();
        wrapper.unmount();
        return scoreOf(game, team);
      }
      const plain = await turn(false);
      expect(await turn(true)).toBe(plain);
    });
  });

  describe('acting hint', () => {
    const hintButton = 'Acting hint (-1)';
    const findHint = (wrapper: VueWrapper, label = hintButton) =>
      wrapper.findAll('button').find((b) => b.text().includes(label));
    const pressHint = async (wrapper: VueWrapper, label = hintButton) => {
      await findHint(wrapper, label)!.trigger('click');
    };
    const tip = 'Wave both arms and wiggle all your fingers like eight tentacles.';

    it('shows the tip before Start and charges the penalty once', async () => {
      const { wrapper, game } = await openTurn('single', ['octopus']);
      const team = game.state!.currentTeam;
      await press(wrapper, en.showWord);
      expect(wrapper.text()).not.toContain(tip);
      await pressHint(wrapper);
      expect(wrapper.text()).toContain(tip);
      expect(findHint(wrapper)).toBeUndefined();
      await press(wrapper, en.start);
      expect(findHint(wrapper)).toBeUndefined();
      await press(wrapper, en.guessed);
      expect(wrapper.text()).toContain(en.hintCost);
      await press(wrapper, en.next);
      await flushPromises();
      const tileValue = game.state!.settings.points[game.state!.tiles[0]!.difficulty];
      // Guessed straight away, so the fast-guess bonus applies as well.
      const fast = DEFAULT_GAME_SETTINGS.single.fastGuessBonus;
      expect(scoreOf(game, team)).toBe(tileValue + fast - DEFAULT_GAME_SETTINGS.single.hintPenalty);
    });

    it('has no hint button for a word without a tip', async () => {
      const { wrapper } = await openTurn('single', ['a made-up word']);
      await press(wrapper, en.showWord);
      expect(findHint(wrapper)).toBeUndefined();
    });

    it('is free when the penalty is 0', async () => {
      const { wrapper, game } = await openTurn('single', ['octopus']);
      game.state!.settings.single.hintPenalty = 0;
      await press(wrapper, en.showWord);
      await pressHint(wrapper, 'Acting hint');
      expect(wrapper.text()).toContain(tip);
      expect(game.state!.teams.every((t) => t.score === 0)).toBe(true);
    });

    it('is used up by a word change: the tip goes and no second hint is offered', async () => {
      const { wrapper } = await openTurn('single', ['octopus', 'cat']);
      await press(wrapper, en.showWord);
      await pressHint(wrapper);
      const reroll = wrapper.findAll('button').find((b) => b.text().includes('Change word'));
      await reroll!.trigger('click');
      expect(wrapper.text()).not.toContain(tip);
      expect(findHint(wrapper)).toBeUndefined();
    });
  });

  describe('changing a word on the result screen', () => {
    const other = (level: Difficulty): Difficulty => (level === 1 ? 2 : 1);

    /**
     * Plays a single-word turn up to the result. The word shown is the first one of the tile's real
     * pool, or with `movedIn` a word of another difficulty that was moved here earlier. `keepOnly`
     * hides every other word of the pool.
     */
    async function toResult(options: { movedIn?: boolean; keepOnly?: boolean } = {}) {
      let word = '';
      let cat = '';
      let level: Difficulty = 1;
      let native: Difficulty = 1;
      const t = await openTurn('single', (game) => {
        const tile = game.state!.tiles[0]!;
        cat = tile.categoryId;
        level = tile.difficulty;
        native = other(level);
        const custom = useCustomStore();
        if (options.movedIn) {
          word = builtinWords('en', cat, native)[0]!;
          custom.placeWord('en', cat, word, level);
        } else {
          word = getPool('en', cat, level)[0]!;
        }
        if (options.keepOnly) {
          for (const w of getPool('en', cat, level)) {
            if (w !== word) custom.placeWord('en', cat, w, 'hidden');
          }
        }
        return [word];
      });
      await press(t.wrapper, en.showWord);
      await press(t.wrapper, en.start);
      await press(t.wrapper, en.guessed);
      expect(t.wrapper.text()).toContain(en.resultTitle);
      return { ...t, word, cat, level, native };
    }
    const row = (wrapper: VueWrapper, word: string) =>
      wrapper.findAll('.words-list .q-item').find((r) => r.text().includes(word))!;
    /** Opens the row's Change menu and taps the entry whose text contains `label`. */
    async function choose(wrapper: VueWrapper, word: string, label: string) {
      await row(wrapper, word).find('button').trigger('click');
      await vi.advanceTimersByTimeAsync(500);
      const item = [...document.body.querySelectorAll<HTMLElement>('.q-menu .q-item')].find((i) =>
        i.textContent?.includes(label),
      );
      if (!item) throw new Error(`No menu entry "${label}"`);
      item.click();
      await vi.advanceTimersByTimeAsync(500);
    }
    const menuLabels = async (wrapper: VueWrapper, word: string) => {
      await row(wrapper, word).find('button').trigger('click');
      await vi.advanceTimersByTimeAsync(500);
      return [...document.body.querySelectorAll('.q-menu .q-item__section--main')].map((i) =>
        i.textContent?.trim(),
      );
    };
    it('hides a word, and undo brings it back', async () => {
      const { wrapper, word, cat, level } = await toResult();
      await choose(wrapper, word, en.hideWord);
      expect(getPool('en', cat, level)).not.toContain(word);
      expect(row(wrapper, word).text()).toContain(en.statusHidden);
      await choose(wrapper, word, en.undoChange);
      expect(getPool('en', cat, level)).toContain(word);
      expect(row(wrapper, word).text()).not.toContain(en.statusHidden);
    });

    it('moves a word to another difficulty and marks it as seen there', async () => {
      const { wrapper, word, cat, level, game } = await toResult();
      const spy = vi.spyOn(game, 'markTileSeen');
      const to = other(level);
      await choose(wrapper, word, en.moveTo.replace('{level}', en[`level${to}`]));
      expect(getPool('en', cat, level)).not.toContain(word);
      expect(getPool('en', cat, to)).toContain(word);
      expect(spy).toHaveBeenCalledWith(cat, to, word);
      expect(row(wrapper, word).text()).toContain(en.statusMoved.replace('{level}', en[`level${to}`]));
      expect(useCustomStore().wordsOf('en', cat, to)).toEqual([]);
    });

    it('does not offer the word\'s own difficulty as a target', async () => {
      const { wrapper, word, level } = await toResult();
      const labels = await menuLabels(wrapper, word);
      expect(labels.some((l) => l?.includes(en.moveTo.replace('{level}', en[`level${level}`])))).toBe(false);
      expect(labels).toContain(en.hideWord);
      expect(labels).not.toContain(en.undoChange);
      expect(labels).not.toContain(en.backOriginal);
    });

    it('starts from the original word when the choice changes', async () => {
      const { wrapper, word, cat, level } = await toResult();
      const to = other(level);
      await choose(wrapper, word, en.moveTo.replace('{level}', en[`level${to}`]));
      await choose(wrapper, word, en.hideWord);
      expect(getPool('en', cat, to)).not.toContain(word);
      expect(getPool('en', cat, level)).not.toContain(word);
      await choose(wrapper, word, en.undoChange);
      expect(getPool('en', cat, level)).toContain(word);
      expect(getPool('en', cat, to)).not.toContain(word);
      expect(useCustomStore().of('en').overrides).toEqual({});
    });

    it('lets a word moved earlier go back to its original level', async () => {
      const { wrapper, word, cat, native } = await toResult({ movedIn: true });
      const labels = await menuLabels(wrapper, word);
      expect(labels).toContain(en.backOriginal);
      expect(labels).not.toContain(en.undoChange);
      // The menu is still open from reading its entries: tap the entry in it.
      [...document.body.querySelectorAll<HTMLElement>('.q-menu .q-item')]
        .find((i) => i.textContent?.includes(en.backOriginal))!
        .click();
      await vi.advanceTimersByTimeAsync(500);
      expect(useCustomStore().placementOf('en', cat, word)).toBe('native');
      expect(getPool('en', cat, native)).toContain(word);
      expect(row(wrapper, word).text()).toContain(en.statusOriginal);
      await choose(wrapper, word, en.undoChange);
      expect(getPool('en', cat, native)).not.toContain(word);
    });

    it('warns when the change leaves the list without words', async () => {
      const { wrapper, word, cat, level } = await toResult({ keepOnly: true });
      await choose(wrapper, word, en.hideWord);
      expect(getPool('en', cat, level)).toEqual([]);
      expect(wrapper.text()).toContain(messages.en.packs.emptiedHint);
      await choose(wrapper, word, en.undoChange);
      expect(wrapper.text()).not.toContain(messages.en.packs.emptiedHint);
    });
  });
});
