import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import * as Quasar from 'quasar';
import type { Pinia } from 'pinia';
import { defineComponent, h, type Component } from 'vue';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import messages from '@/i18n';

const qComponents = Object.fromEntries(Object.entries(Quasar).filter(([k]) => /^Q[A-Z]/.test(k)));

const stub = (name: string) => defineComponent({ name, render: () => h('div', name) });

/**
 * Mounts one page at `path` inside a Quasar layout with a memory router. Other routes the pages
 * navigate to are stubs, so tests can read `router.currentRoute` to see where a page went.
 * Needs a happy-dom test environment.
 */
export async function mountPage(
  path: string,
  page: Component,
  pinia: Pinia,
  /** Route pattern when `path` has parameters, e.g. `/packs/:id`. */
  pattern = path,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: stub('home') },
      { path: '/setup', component: stub('setup') },
      { path: '/board', component: stub('board') },
      { path: '/turn', component: stub('turn') },
      { path: '/gold', component: stub('gold') },
      { path: '/results', component: stub('results') },
      { path: '/packs', component: stub('packs') },
      { path: '/help', component: stub('help') },
      { path: pattern, component: page },
    ].reverse(),
  });
  await router.push(path);
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
          [Quasar.Quasar, { components: qComponents, directives: { ClosePopup: Quasar.ClosePopup }, plugins: { Notify: Quasar.Notify } }],
          createI18n({ legacy: false, locale: 'en', messages }),
        ],
      },
    },
  );
  await flushPromises();
  return { wrapper, router };
}

/** Clicks the button whose label is exactly `text`. */
export async function press(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`No button "${text}". Page shows: ${wrapper.text()}`);
  await button.trigger('click');
}

export const hasButton = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').some((b) => b.text() === text);
