// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import messages from '@/i18n';
import SetupPage from '@/pages/SetupPage.vue';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { useSetupStore } from '@/stores/setup';
import { listCategories } from '@/services/packs';
import { stubLocalStorage } from '../helpers/storage';
import { hasButton, mountPage, press } from '../helpers/mountPage';

const en = messages.en.setup;

async function openSetup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  const mounted = await mountPage('/setup', SetupPage, pinia);
  return { ...mounted, setup: useSetupStore(), game: useGameStore() };
}

const cards = (w: Awaited<ReturnType<typeof openSetup>>['wrapper']) =>
  w.findAll('[role="checkbox"]');

describe('SetupPage', () => {
  beforeEach(() => void stubLocalStorage());
  afterEach(() => void (document.body.innerHTML = ''));

  it('starts with two teams and every category selected', async () => {
    const { wrapper, setup } = await openSetup();
    expect(setup.teamCount).toBe(2);
    expect(setup.categoryIds).toEqual(listCategories('en').map((c) => c.id));
    expect(wrapper.findAll('.team-circle')).toHaveLength(2);
  });

  it('adds teams up to the maximum and then disables the button', async () => {
    const { wrapper, setup } = await openSetup();
    const add = () => wrapper.find(`[aria-label="${en.addTeam}"]`);
    for (let i = 0; i < 4; i++) await add().trigger('click');
    expect(setup.teamCount).toBe(6);
    expect(add().attributes('disabled')).toBeDefined();
  });

  it('switches the game mode', async () => {
    const { wrapper, setup } = await openSetup();
    expect(setup.mode).toBe('single');
    await wrapper.findAll('[role="radio"]')[1]!.trigger('click');
    expect(setup.mode).toBe('multi');
    expect(wrapper.findAll('[role="radio"]')[1]!.attributes('aria-checked')).toBe('true');
  });

  it('moves to the categories step and back', async () => {
    const { wrapper } = await openSetup();
    await press(wrapper, en.next);
    await flushPromises();
    expect(hasButton(wrapper, en.start)).toBe(true);
    await press(wrapper, en.back);
    await flushPromises();
    expect(hasButton(wrapper, en.next)).toBe(true);
  });

  it('toggles a category and clears or selects them all', async () => {
    const { wrapper, setup } = await openSetup();
    await press(wrapper, en.next);
    const total = setup.categoryIds.length;
    await cards(wrapper)[0]!.trigger('click');
    expect(setup.categoryIds).toHaveLength(total - 1);
    const toggleAll = () => wrapper.find('.select-all-btn').trigger('click');
    expect(wrapper.find('.select-all-btn').text()).toContain(en.selectAll);
    await toggleAll();
    expect(setup.categoryIds).toHaveLength(total);
    expect(wrapper.find('.select-all-btn').text()).toContain(en.clearAll);
    await toggleAll();
    expect(setup.categoryIds).toEqual([]);
  });

  it('starts a game with the chosen setup and opens the board', async () => {
    const { wrapper, setup, game, router } = await openSetup();
    await wrapper.findAll('[role="radio"]')[1]!.trigger('click');
    await press(wrapper, en.next);
    setup.categoryIds = setup.categoryIds.slice(0, 3);
    await press(wrapper, en.start);
    await flushPromises();
    expect(game.state?.mode).toBe('multi');
    expect(game.state?.teams).toHaveLength(2);
    expect(new Set(game.state?.tiles.map((t) => t.categoryId))).toEqual(
      new Set(setup.categoryIds),
    );
    expect(router.currentRoute.value.path).toBe('/board');
  });

  // Known bug: canAdvance only guards the Next button, so Start stays enabled and tapping it
  // throws in createGame. Remove `.fails` once Start is disabled below the minimum.
  it.fails('disables Start with too few categories', async () => {
    const { wrapper, setup } = await openSetup();
    await press(wrapper, en.next);
    setup.categoryIds = [];
    await flushPromises();
    const start = wrapper.findAll('button').find((b) => b.text() === en.start)!;
    expect(start.attributes('disabled')).toBeDefined();
  });
});
