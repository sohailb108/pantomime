// @vitest-environment happy-dom
import type * as QuasarModule from 'quasar';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import HelpPage from '@/pages/HelpPage.vue';
import { checkForUpdate, resetApp, updateSupported } from '@/services/update';
import { useSettingsStore } from '@/stores/settings';
import { mountPage } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

const notify = vi.hoisted(() => vi.fn());
vi.mock('quasar', async (original) => ({
  ...(await original<typeof QuasarModule>()),
  useQuasar: () => ({ notify }),
}));
vi.mock('@/services/update', () => ({
  updateSupported: ref(false),
  checkForUpdate: vi.fn(),
  resetApp: vi.fn(),
}));

const en = messages.en;

async function openHelp(lang = 'en') {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = lang;
  return mountPage('/help', HelpPage, pinia);
}

const button = (label: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

describe('HelpPage', () => {
  beforeEach(() => {
    stubLocalStorage();
    notify.mockReset();
    vi.mocked(checkForUpdate).mockReset();
    vi.mocked(resetApp).mockReset();
    updateSupported.value = false;
  });
  afterEach(() => void (document.body.innerHTML = ''));

  it('shows every help section, with the first one open', async () => {
    const { wrapper } = await openHelp();
    const sections = wrapper.findAll('.help-card');
    expect(sections).toHaveLength(9);
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

  describe('updates', () => {
    const open = async () => {
      const mounted = await openHelp();
      // The buttons live in the About section, which is closed until opened.
      await mounted.wrapper.findAll('.help-card').at(-1)!.find('.q-item').trigger('click');
      await flushPromises();
      return mounted;
    };

    it('hides the update check when there is no service worker', async () => {
      await open();
      expect(button(en.update.check)).toBeUndefined();
    });

    it.each([
      ['latest', en.update.latest],
      ['downloading', en.update.downloading],
      ['failed', en.update.failed],
    ] as const)('tells the user the result when the check says %s', async (result, message) => {
      updateSupported.value = true;
      vi.mocked(checkForUpdate).mockResolvedValue(result);
      await open();
      button(en.update.check)!.click();
      await flushPromises();
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message }));
    });

    it('stays quiet when an update is ready, the refresh prompt handles it', async () => {
      updateSupported.value = true;
      vi.mocked(checkForUpdate).mockResolvedValue('ready');
      await open();
      button(en.update.check)!.click();
      await flushPromises();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    const openReset = async () => {
      const mounted = await openHelp();
      await mounted.wrapper.findAll('.help-card').at(-1)!.find('.q-item').trigger('click');
      await flushPromises();
      button(en.update.reset)!.click();
      await flushPromises();
      return mounted;
    };

    it('asks before wiping anything', async () => {
      await openReset();
      expect(document.body.textContent).toContain(en.update.resetTitle);
      expect(resetApp).not.toHaveBeenCalled();
    });

    it('wipes the app after the user confirms', async () => {
      await openReset();
      // Exact match: "Reset the app" on the page also contains this label.
      [...document.body.querySelectorAll('button')]
        .find((b) => b.textContent?.trim() === en.update.resetConfirm)!
        .click();
      await flushPromises();
      expect(resetApp).toHaveBeenCalledTimes(1);
    });
  });
});
