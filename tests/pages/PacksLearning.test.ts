// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import PacksPage from '@/pages/PacksPage.vue';
import type * as learningPacks from '@/services/learningPacks';
import { useLearningStore } from '@/stores/learning';
import { useSettingsStore } from '@/stores/settings';
import { useSetupStore } from '@/stores/setup';
import { mountPage } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

vi.mock('@/services/learningPacks', async () => {
  const actual = await vi.importActual<Pick<typeof learningPacks, 'createLearningPacks'>>('@/services/learningPacks');
  const { learningFiles, learningIndexes } = await import('../fixtures/learning');
  return actual.createLearningPacks(learningFiles, learningIndexes);
});

const en = messages.en.packs;

async function openPacks(lang: 'en' | 'de' = 'de') {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  useSetupStore().setWordLanguage(lang);
  const learning = useLearningStore();
  learning.placeWord('de', 'a1', 'food', 'Brot', 'hidden');
  learning.placeWord('de', 'a2', 'food', 'Käse', 'hidden');
  learning.placeWord('de', 'a2', 'sport', 'Käse', 'hidden');
  const mounted = await mountPage('/packs', PacksPage, pinia);
  return { ...mounted, learning };
}

describe('PacksPage with learning packs', () => {
  beforeEach(() => void stubLocalStorage());
  afterEach(() => void (document.body.innerHTML = ''));

  it('shows the note and the hidden words by level for a language with learning packs', async () => {
    const { wrapper } = await openPacks();
    expect(wrapper.text()).toContain(en.learningNote);
    const text = wrapper.text();
    expect(text.indexOf('A1')).toBeGreaterThan(-1);
    expect(text.indexOf('A1')).toBeLessThan(text.indexOf('A2'));
    expect(wrapper.findAll('.hidden-word').map((c) => c.text().replace('visibility', ''))).toEqual(['Brot', 'Käse']);
  });

  it('shows a hidden word again after confirming, in every category that hid it', async () => {
    const { wrapper, learning } = await openPacks();
    await wrapper.findAll('.hidden-word')[1]!.trigger('click');
    await flushPromises();
    const confirm = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(en.show));
    confirm!.click();
    await flushPromises();
    expect(learning.hiddenList('de').map((h) => h.word)).toEqual(['Brot']);
    expect(wrapper.findAll('.hidden-word').map((c) => c.text().replace('visibility', ''))).toEqual(['Brot']);
  });

  it('shows no note for a language without learning packs', async () => {
    const { wrapper } = await openPacks('en');
    expect(wrapper.text()).not.toContain(en.learningNote);
    expect(wrapper.findAll('.hidden-word')).toHaveLength(0);
  });
});
