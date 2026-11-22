// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import SetupPage from '@/pages/SetupPage.vue';
import type * as learningPacks from '@/services/learningPacks';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { useSetupStore } from '@/stores/setup';
import { stubLocalStorage } from '../helpers/storage';
import { hasButton, mountPage, press } from '../helpers/mountPage';

vi.mock('@/services/learningPacks', async () => {
  const actual = await vi.importActual<Pick<typeof learningPacks, 'createLearningPacks'>>('@/services/learningPacks');
  const { learningFiles, learningIndexes } = await import('../fixtures/learning');
  return actual.createLearningPacks(learningFiles, learningIndexes);
});

const en = messages.en.setup;

async function openSetup(lang: 'en' | 'de' = 'de') {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  const mounted = await mountPage('/setup', SetupPage, pinia);
  const setup = useSetupStore();
  setup.setWordLanguage(lang);
  await flushPromises();
  await press(mounted.wrapper, en.next);
  return { ...mounted, setup, game: useGameStore() };
}

const chips = (w: Awaited<ReturnType<typeof openSetup>>['wrapper']) => w.findAll('.level-chips .q-chip');

describe('SetupPage with learning packs', () => {
  beforeEach(() => void stubLocalStorage());
  afterEach(() => void (document.body.innerHTML = ''));

  it('shows the pack type only for a language with learning packs', async () => {
    const english = await openSetup('en');
    expect(hasButton(english.wrapper, en.packLearning)).toBe(false);
    document.body.innerHTML = '';
    const german = await openSetup('de');
    expect(hasButton(german.wrapper, en.packLearning)).toBe(true);
    expect(chips(german.wrapper)).toHaveLength(0);
  });

  it('lists the categories of the chosen levels and keeps one level on', async () => {
    const { wrapper, setup } = await openSetup();
    await press(wrapper, en.packLearning);
    await flushPromises();
    expect(setup.content).toEqual({ lang: 'de', kind: 'learning', levels: ['a1'] });
    expect(chips(wrapper).map((c) => c.text())).toEqual(['A1', 'A2']);
    expect(wrapper.text()).toContain('Tiere');
    expect(wrapper.text()).toContain('Essen4 words');

    await chips(wrapper)[1]!.trigger('click');
    await flushPromises();
    expect(setup.content.levels).toEqual(['a1', 'a2']);
    // Sport has no hard words, so it never makes a category; food gets the A2 words (the duplicate "brot" counts once).
    expect(wrapper.text()).toContain('Essen7 words');
    expect(setup.categoryIds.sort()).toEqual(['animals', 'food']);

    await chips(wrapper)[0]!.trigger('click');
    await chips(wrapper)[1]!.trigger('click');
    await flushPromises();
    expect(setup.content.levels).toEqual(['a2']);
    expect(wrapper.text()).not.toContain('Tiere');
  });

  it('starts a learning game without a gold round', async () => {
    const { wrapper, setup, game } = await openSetup();
    expect(setup.settings.gold.enabled).toBe(true);
    await press(wrapper, en.packLearning);
    await flushPromises();
    await press(wrapper, en.start);
    await flushPromises();
    expect(game.content).toEqual({ lang: 'de', kind: 'learning', levels: ['a1'] });
    expect(game.state?.settings.gold.enabled).toBe(false);
    expect(setup.settings.gold.enabled).toBe(true);
  });

  it('remembers the pack type and levels', async () => {
    const first = await openSetup();
    await press(first.wrapper, en.packLearning);
    first.setup.toggleLevel('a2');
    await flushPromises();
    document.body.innerHTML = '';
    const pinia = createPinia();
    setActivePinia(pinia);
    useSettingsStore().language = 'en';
    const again = useSetupStore();
    expect(again.packKind).toBe('learning');
    expect(again.content.levels).toEqual(['a1', 'a2']);
  });

  it('falls back to normal packs in a language without learning packs', async () => {
    const { setup } = await openSetup();
    setup.setPackKind('learning');
    setup.setWordLanguage('en');
    expect(setup.content).toEqual({ lang: 'en', kind: 'normal', levels: [] });
  });
});
