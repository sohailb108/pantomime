// @vitest-environment happy-dom
import type * as QuasarModule from 'quasar';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import PacksPage from '@/pages/PacksPage.vue';
import { buildExport, emptyWords, normalizeLang } from '@/services/customData';
import { listBuiltinCategories } from '@/services/builtinPacks';
import { useCustomStore } from '@/stores/custom';
import { useSettingsStore } from '@/stores/settings';
import { startGame } from '../helpers/game';
import { mountPage } from '../helpers/mountPage';
import { stubLocalStorage } from '../helpers/storage';

const notify = vi.hoisted(() => vi.fn());
vi.mock('quasar', async (original) => ({
  ...(await original<typeof QuasarModule>()),
  useQuasar: () => ({ notify }),
}));

const en = messages.en.packs;

async function openPacks(prepare: () => void = () => undefined) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  prepare();
  const mounted = await mountPage('/packs', PacksPage, pinia);
  return { ...mounted, custom: useCustomStore() };
}

/** Puts a file into the page's hidden file input and fires its change event. */
async function chooseFile(content: string) {
  const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([content], 'words.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await flushPromises();
}

/** A words file for English: a custom category with one word and one extra word for Animals. */
function exportedFile() {
  const data = normalizeLang({});
  data.categories.push({ id: 'c-cars', name: 'Cars', words: { ...emptyWords(), 1: ['car'] } });
  data.extra.animals = { ...emptyWords(), 1: ['yak'] };
  return JSON.stringify(buildExport('en', data));
}

describe('PacksPage', () => {
  beforeEach(() => {
    stubLocalStorage();
    notify.mockReset();
  });
  afterEach(() => void (document.body.innerHTML = ''));

  it('lists every built-in category and the gold round', async () => {
    const { wrapper } = await openPacks();
    const cards = wrapper.findAll('.pack-card');
    expect(cards).toHaveLength(listBuiltinCategories('en').length + 1);
    expect(cards.at(-1)!.text()).toContain(en.gold);
    expect(cards[0]!.attributes('href')).toBe('/packs/animals');
  });

  it('marks incomplete custom categories and counts extra words in built-in ones', async () => {
    const { wrapper } = await openPacks(() => {
      setActivePinia(createPinia());
      const store = useCustomStore();
      store.addCategory('en', 'Cars');
      store.addWord('en', 'animals', 1, 'yak');
    });
    expect(wrapper.text()).toContain(en.incomplete);
    expect(wrapper.text()).toContain('1 of your words');
  });

  describe('new category', () => {
    it('cannot be created with an empty name', async () => {
      const { wrapper } = await openPacks();
      await wrapper.findAll('button').find((b) => b.text().includes(en.newCategory))!.trigger('click');
      await flushPromises();
      const create = [...document.body.querySelectorAll('button')].find(
        (b) => b.textContent === en.create,
      )!;
      expect(create.disabled).toBe(true);
    });

    it('creates the category and opens it', async () => {
      const { wrapper, custom, router } = await openPacks();
      await wrapper.findAll('button').find((b) => b.text().includes(en.newCategory))!.trigger('click');
      await flushPromises();
      const input = document.body.querySelector<HTMLInputElement>('.q-dialog input')!;
      input.value = 'Cars';
      input.dispatchEvent(new Event('input'));
      await flushPromises();
      [...document.body.querySelectorAll('button')].find((b) => b.textContent === en.create)!.click();
      await flushPromises();
      const created = custom.of('en').categories[0]!;
      expect(created.name).toBe('Cars');
      expect(router.currentRoute.value.path).toBe(`/packs/${created.id}`);
    });

    it('opens the existing category when the name is taken', async () => {
      const { wrapper, custom, router } = await openPacks();
      await wrapper.findAll('button').find((b) => b.text().includes(en.newCategory))!.trigger('click');
      await flushPromises();
      const input = document.body.querySelector<HTMLInputElement>('.q-dialog input')!;
      input.value = 'animals';
      input.dispatchEvent(new Event('input'));
      await flushPromises();
      [...document.body.querySelectorAll('button')].find((b) => b.textContent === en.create)!.click();
      await flushPromises();
      expect(custom.of('en').categories).toHaveLength(0);
      expect(router.currentRoute.value.path).toBe('/packs/animals');
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: en.alreadyExists }));
    });
  });

  describe('export', () => {
    it('downloads a file named for the language and says so', async () => {
      const create = vi.fn(() => 'blob:x');
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      const { wrapper } = await openPacks();
      await wrapper.findAll('button').find((b) => b.text().includes(en.export))!.trigger('click');
      expect(create).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalled();
      expect(wrapper.find('.status-banner').text()).toContain(en.exported);
      click.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe('import', () => {
    it('imports a valid file and reports how many words were added', async () => {
      const file = exportedFile();
      const { wrapper, custom } = await openPacks();
      await chooseFile(file);
      expect(custom.wordsOf('en', 'animals', 1)).toContain('yak');
      expect(custom.of('en').categories.map((c) => c.name)).toContain('Cars');
      expect(wrapper.find('.status-banner').text()).toContain('Imported 2 words');
    });

    it('rejects a broken file and changes nothing', async () => {
      const { wrapper, custom } = await openPacks();
      await chooseFile('not json');
      expect(wrapper.find('.status-banner').text()).toContain(en.importErr.invalid);
      expect(custom.of('en').categories).toHaveLength(0);
    });

    it('rejects a file for another language', async () => {
      const file = exportedFile().replace('"lang":"en"', '"lang":"fa"');
      const { wrapper } = await openPacks();
      await chooseFile(file);
      expect(wrapper.find('.status-banner').text()).toContain(en.importErr.language);
    });

    it('is blocked while a game of this language is running', async () => {
      const { wrapper } = await openPacks(() => void startGame());
      const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
      const click = vi.spyOn(input, 'click');
      await wrapper.findAll('button').find((b) => b.text().includes(en.import))!.trigger('click');
      expect(click).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: en.importInGame }));
    });

    it('opens the file picker when no game is running', async () => {
      const { wrapper } = await openPacks();
      const input = document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
      const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
      await wrapper.findAll('button').find((b) => b.text().includes(en.import))!.trigger('click');
      expect(click).toHaveBeenCalled();
    });
  });
});
