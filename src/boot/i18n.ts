import { defineBoot } from '#q-app';
import { watch } from 'vue';
import { createI18n } from 'vue-i18n';
import { Dark, setCssVar } from 'quasar';
import { getPalette } from '@/config/palettes';

import messages from '@/i18n';
import { applyLanguage } from '@/services/language';
import { useSettingsStore } from '@/stores/settings';

export type MessageLanguages = keyof typeof messages;
// Type-define 'fa' as the master schema for the resource
export type MessageSchema = (typeof messages)['fa'];

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema {}

  // define the datetime format schema
  export interface DefineDateTimeFormat {}

  // define the number format schema
  export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

export default defineBoot(async ({ app, store }) => {
  const settings = useSettingsStore(store);

  const i18n = createI18n({
    locale: settings.language,
    fallbackLocale: 'fa',
    legacy: false,
    messages,
  });
  app.use(i18n);

  Dark.set(settings.dark);
  const applyPalette = () => {
    const p = getPalette(settings.palette);
    setCssVar('primary', settings.dark ? p.primaryDark : p.primary);
    setCssVar('secondary', p.secondary);
    setCssVar('accent', p.accent);
  };
  applyPalette();
  watch(() => [settings.palette, settings.dark], applyPalette);
  await applyLanguage(settings.language);

  watch(
    () => settings.language,
    async (code) => {
      i18n.global.locale.value = code as MessageLanguages;
      await applyLanguage(code);
    },
  );
  watch(
    () => settings.dark,
    (value) => Dark.set(value),
  );
});
