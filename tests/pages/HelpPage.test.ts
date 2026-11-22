// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import HelpPage from '@/pages/HelpPage.vue';
import { useSettingsStore } from '@/stores/settings';
import { mountPage } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

const en = messages.en;

async function openHelp(lang = 'en') {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = lang;
  return mountPage('/help', HelpPage, pinia);
}

describe('HelpPage', () => {
  beforeEach(() => {
    stubLocalStorage();
  });
  afterEach(() => void (document.body.innerHTML = ''));

  it('shows every help section, with the first one open', async () => {
    const { wrapper } = await openHelp();
    const sections = wrapper.findAll('.help-card');
    expect(sections).toHaveLength(8);
    expect(sections[0]!.text()).toContain(en.help.sections.quickStart.title);
    expect(sections[0]!.find('.help-body').isVisible()).toBe(true);
  });

  it('fills in the game defaults and the app version without leaving placeholders', async () => {
    const { wrapper } = await openHelp();
    expect(wrapper.text()).not.toMatch(/\{\w+\}/);
  });

  it('uses Persian numerals in the Persian help', async () => {
    const { wrapper } = await openHelp('fa');
    expect(wrapper.text()).not.toMatch(/\{\w+\}/);
    expect(wrapper.text()).toMatch(/[۰-۹]/);
  });

  it('goes home when there is no history to go back to', async () => {
    const { wrapper, router } = await openHelp();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    await wrapper.find(`[aria-label="${en.help.back}"]`).trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');
  });
});
