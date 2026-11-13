// @vitest-environment happy-dom
import type * as QuasarModule from 'quasar';
import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n';
import PackEditPage from '@/pages/PackEditPage.vue';
import { builtinGoldWords, builtinWords } from '@/services/words';
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

/** `prepare` runs on the page's own store and may return the id to open instead of `id`. */
async function openEdit(id: string, prepare: () => string | void = () => undefined) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useSettingsStore().language = 'en';
  id = prepare() ?? id;
  const mounted = await mountPage(`/packs/${id}`, PackEditPage, pinia, '/packs/:id');
  return { ...mounted, custom: useCustomStore(), id };
}

/** Types a word into the n-th list's input and submits its form. */
async function addWord(wrapper: VueWrapper, list: number, word: string) {
  const card = wrapper.findAll('.word-card')[list]!;
  await card.find('input').setValue(word);
  await card.find('form').trigger('submit');
  await flushPromises();
}

const dialogButton = (label: string) =>
  [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

describe('PackEditPage', () => {
  beforeEach(() => {
    stubLocalStorage();
    notify.mockReset();
  });
  afterEach(() => void (document.body.innerHTML = ''));

  describe('a built-in category', () => {
    it('shows three difficulty lists with their built-in word counts', async () => {
      const { wrapper } = await openEdit('animals');
      const cards = wrapper.findAll('.word-card');
      expect(cards).toHaveLength(3);
      expect(cards[0]!.text()).toContain(`${builtinWords('en', 'animals', 1).length} built-in`);
      expect(wrapper.text()).toContain('Animals');
    });

    it('adds an extra word to one difficulty, and removes it again', async () => {
      const { wrapper, custom } = await openEdit('animals');
      await addWord(wrapper, 1, 'yak');
      expect(custom.wordsOf('en', 'animals', 2)).toEqual(['yak']);
      expect(wrapper.findAll('.word-card')[1]!.text()).toContain('yak');
      await wrapper.find('.word-chip .q-chip__icon--remove').trigger('click');
      expect(custom.wordsOf('en', 'animals', 2)).toEqual([]);
    });

    it('shows an error for a duplicate word and keeps the list', async () => {
      const { wrapper, custom } = await openEdit('animals');
      await addWord(wrapper, 0, 'yak');
      await addWord(wrapper, 0, 'YAK');
      expect(wrapper.findAll('.word-card')[0]!.text()).toContain(en.err.duplicate);
      expect(custom.wordsOf('en', 'animals', 1)).toEqual(['yak']);
    });

    it('does not offer edit or delete for a built-in category', async () => {
      const { wrapper } = await openEdit('animals');
      expect(wrapper.find(`[aria-label="${en.edit}"]`).exists()).toBe(false);
      expect(wrapper.find(`[aria-label="${en.deleteCategory}"]`).exists()).toBe(false);
    });

    it('lists hidden words and puts one back after confirming', async () => {
      const word = builtinWords('en', 'animals', 1)[0]!;
      const { wrapper, custom } = await openEdit('animals', () => {
        setActivePinia(createPinia());
        useCustomStore().hideWord('en', 'animals', 1, word);
      });
      expect(custom.hiddenOf('en', 'animals', 1)).toEqual([word]);
      await wrapper.find('.hidden-word').trigger('click');
      await flushPromises();
      dialogButton(en.show)!.click();
      await flushPromises();
      expect(custom.hiddenOf('en', 'animals', 1)).toEqual([]);
    });

    it('explains when a whole difficulty is hidden', async () => {
      const { wrapper } = await openEdit('animals', () => {
        setActivePinia(createPinia());
        const custom = useCustomStore();
        for (const w of builtinWords('en', 'animals', 3)) custom.hideWord('en', 'animals', 3, w);
      });
      expect(wrapper.text()).toContain(en.emptyBuiltinHint);
    });
  });

  describe('the gold round', () => {
    it('shows a single list and adds gold words', async () => {
      const { wrapper, custom } = await openEdit('gold');
      expect(wrapper.findAll('.word-card')).toHaveLength(1);
      expect(wrapper.text()).toContain(`${builtinGoldWords('en').length} built-in`);
      await addWord(wrapper, 0, 'time machine');
      expect(custom.goldWords('en')).toEqual(['time machine']);
    });
  });

  describe('a custom category', () => {
    const make = () => useCustomStore().addCategory('en', 'Cars')!.id;

    it('is incomplete until each difficulty has a word', async () => {
      const { wrapper } = await openEdit('', make);
      expect(wrapper.text()).toContain(en.incompleteHint);
      expect(wrapper.findAll('.word-card')).toHaveLength(3);
      expect(wrapper.findAll('.word-card')[0]!.text()).not.toContain('built-in');
      await addWord(wrapper, 0, 'sedan');
      await addWord(wrapper, 1, 'van');
      await addWord(wrapper, 2, 'tractor');
      expect(wrapper.text()).not.toContain(en.incompleteHint);
    });

    it('renames, refusing a taken name', async () => {
      const { wrapper, custom, id } = await openEdit('', make);
      await wrapper.find(`[aria-label="${en.edit}"]`).trigger('click');
      await flushPromises();
      const input = document.body.querySelector<HTMLInputElement>('.q-dialog input')!;
      input.value = 'Animals';
      input.dispatchEvent(new Event('input'));
      await flushPromises();
      dialogButton(en.save)!.click();
      await flushPromises();
      expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: en.nameTaken }));
      expect(custom.findCategory('en', id)!.name).toBe('Cars');

      input.value = 'Trucks';
      input.dispatchEvent(new Event('input'));
      await flushPromises();
      dialogButton(en.save)!.click();
      await flushPromises();
      expect(custom.findCategory('en', id)!.name).toBe('Trucks');
    });

    it('deletes after confirming and returns to the list', async () => {
      const { wrapper, custom, router, id } = await openEdit('', make);
      await wrapper.find(`[aria-label="${en.deleteCategory}"]`).trigger('click');
      await flushPromises();
      expect(document.body.textContent).toContain('Delete the category "Cars"');
      dialogButton(en.deleteCategory)!.click();
      await flushPromises();
      expect(custom.findCategory('en', id)).toBeUndefined();
      expect(router.currentRoute.value.path).toBe('/packs');
    });

    describe('while a running game uses it', () => {
      const makeInGame = () => {
        const id = make();
        startGame({ categories: [id, 'animals'] });
        return id;
      };

      it('cannot be deleted', async () => {
        const { wrapper, custom, id } = await openEdit('', makeInGame);
        await wrapper.find(`[aria-label="${en.deleteCategory}"]`).trigger('click');
        await flushPromises();
        expect(document.body.textContent).toContain(en.deleteInGame);
        expect(dialogButton(en.deleteCategory)).toBeUndefined();
        expect(custom.findCategory('en', id)).toBeDefined();
      });

      it('keeps its words until the game ends', async () => {
        const { wrapper, custom, id } = await openEdit('', () => {
          const id = make();
          useCustomStore().addWord('en', id, 1, 'sedan');
          startGame({ categories: [id, 'animals'] });
          return id;
        });
        await wrapper.find('.word-chip .q-chip__icon--remove').trigger('click');
        expect(custom.wordsOf('en', id, 1)).toEqual(['sedan']);
        expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: en.editInGame }));
      });
    });
  });

  it('goes back to the list for an unknown category', async () => {
    const { router } = await openEdit('no-such-category');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/packs');
  });

  it('lets a running game keep going while its built-in category gets extra words', async () => {
    const { wrapper } = await openEdit('animals', () => void startGame());
    await addWord(wrapper, 0, 'yak');
    await wrapper.find('.word-chip .q-chip__icon--remove').trigger('click');
    expect(notify).not.toHaveBeenCalled();
  });
});
