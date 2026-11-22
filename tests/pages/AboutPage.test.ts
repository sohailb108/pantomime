// @vitest-environment happy-dom
import type * as QuasarModule from 'quasar';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import AboutPage from '@/pages/AboutPage.vue';
import { checkForUpdate, resetApp, updateSupported } from '@/services/update';
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

async function openAbout() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mountPage('/about', AboutPage, pinia);
}

const button = (label: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

describe('AboutPage', () => {
  beforeEach(() => {
    stubLocalStorage();
    notify.mockReset();
    vi.mocked(checkForUpdate).mockReset();
    vi.mocked(resetApp).mockReset();
    updateSupported.value = false;
  });
  afterEach(() => void (document.body.innerHTML = ''));

  it('shows the version, the author and a mailto link', async () => {
    const { wrapper } = await openAbout();
    expect(wrapper.text()).toContain('0.0.0-test');
    expect(wrapper.text()).toContain(en.about.author);
    expect(wrapper.text()).not.toMatch(/\{\w+\}/);
    expect(wrapper.find('a.email').attributes('href')).toBe('mailto:pantomime@sohail.pro');
  });

  it('goes home when there is no history to go back to', async () => {
    const { wrapper, router } = await openAbout();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    await wrapper.find(`[aria-label="${en.help.back}"]`).trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');
  });

  describe('updates', () => {
    const open = async () => {
      return openAbout();
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
      const mounted = await openAbout();
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
