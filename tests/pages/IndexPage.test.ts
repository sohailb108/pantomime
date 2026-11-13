// @vitest-environment happy-dom
import type * as QuasarModule from 'quasar';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import IndexPage from '@/pages/IndexPage.vue';
import { installAvailable } from '@/services/install';
import { shareApp } from '@/services/share';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { playAllTiles, startGame } from '../helpers/game';
import { mountPage, press } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

const notify = vi.hoisted(() => vi.fn());
vi.mock('quasar', async (original) => ({
  ...(await original<typeof QuasarModule>()),
  useQuasar: () => ({ notify }),
}));
vi.mock('@/services/share', () => ({ shareApp: vi.fn() }));

const en = messages.en;

async function openHome(prepare: () => void = () => undefined) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  prepare();
  const mounted = await mountPage('/', IndexPage, pinia);
  return { ...mounted, settings: useSettingsStore(), game: useGameStore() };
}

describe('IndexPage', () => {
  beforeEach(() => {
    stubLocalStorage();
    installAvailable.value = false;
    vi.mocked(shareApp).mockReset();
    notify.mockReset();
  });
  afterEach(() => void (document.body.innerHTML = ''));

  it('offers a new game and the version, but no resume without a game', async () => {
    const { wrapper } = await openHome();
    expect(wrapper.text()).toContain(en.home.newGame);
    expect(wrapper.text()).not.toContain(en.home.resume);
    expect(wrapper.text()).toContain('v0.0.0-test');
  });

  it('offers resume and end game while a game is running', async () => {
    const { wrapper } = await openHome(() => void startGame());
    expect(wrapper.text()).toContain(en.home.resume);
    expect(wrapper.text()).toContain(en.home.endGame);
  });

  it('does not offer resume once the game is finished', async () => {
    const { wrapper } = await openHome(() => {
      const game = startGame({ gold: false });
      playAllTiles(game);
      expect(game.state!.status).toBe('finished');
    });
    expect(wrapper.text()).not.toContain(en.home.resume);
  });

  it('ends the game only after confirming', async () => {
    const { wrapper, game } = await openHome(() => void startGame());
    await press(wrapper, `stop_circle${en.home.endGame}`);
    await flushPromises();
    expect(game.state).not.toBeNull();
    const confirm = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent === en.home.endConfirm,
    )!;
    confirm.click();
    await flushPromises();
    expect(game.state).toBeNull();
  });

  it('keeps the game when the end dialog is closed', async () => {
    const { wrapper, game } = await openHome(() => void startGame());
    await press(wrapper, `stop_circle${en.home.endGame}`);
    await flushPromises();
    [...document.body.querySelectorAll('button')]
      .find((b) => b.textContent === messages.en.setup.close)!
      .click();
    await flushPromises();
    expect(game.state).not.toBeNull();
  });

  it('switches the language and remembers it', async () => {
    const { wrapper, settings } = await openHome();
    const fa = wrapper.findAll('.lang-toggle button').find((b) => b.text() === 'فارسی')!;
    await fa.trigger('click');
    expect(settings.language).toBe('fa');
  });

  it('changes the color theme', async () => {
    const { wrapper, settings } = await openHome();
    const radios = wrapper.findAll('[role="radiogroup"] [role="radio"]');
    expect(radios.length).toBeGreaterThan(1);
    await radios[1]!.trigger('click');
    expect(settings.palette).not.toBe(radios[0]!.attributes('aria-label'));
    expect(radios[1]!.attributes('aria-checked')).toBe('true');
  });

  it('toggles dark mode and sound', async () => {
    const { wrapper, settings } = await openHome();
    const toggles = wrapper.findAll('[role="switch"]');
    await toggles[0]!.trigger('click');
    expect(settings.dark).toBe(true);
    await toggles[1]!.trigger('click');
    expect(settings.sound).toBe(false);
  });

  it('shares the app and tells the user when the link was copied', async () => {
    vi.mocked(shareApp).mockResolvedValue('copied');
    const { wrapper } = await openHome();
    await wrapper.find(`[aria-label="${en.home.share}"]`).trigger('click');
    await flushPromises();
    expect(shareApp).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: en.home.linkCopied }));
  });

  it('reports a failed share, and stays quiet when the share sheet worked', async () => {
    vi.mocked(shareApp).mockResolvedValue('shared');
    const { wrapper } = await openHome();
    await wrapper.find(`[aria-label="${en.home.share}"]`).trigger('click');
    await flushPromises();
    expect(notify).not.toHaveBeenCalled();
    vi.mocked(shareApp).mockResolvedValue('failed');
    await wrapper.find(`[aria-label="${en.home.share}"]`).trigger('click');
    await flushPromises();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: en.home.shareFailed }));
  });

  it('shows the install button only when installing is possible', async () => {
    const { wrapper } = await openHome();
    expect(wrapper.text()).not.toContain(en.home.install);
    installAvailable.value = true;
    await flushPromises();
    expect(wrapper.text()).toContain(en.home.install);
  });
});
