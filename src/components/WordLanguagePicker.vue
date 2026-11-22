<template>
  <div class="row justify-center">
    <q-btn-toggle dir="ltr" class="word-lang-toggle" :model-value="setup.contentLang" rounded unelevated no-caps toggle-color="primary" :options="options" :aria-label="t('setup.wordLanguage')" @update:model-value="setup.setWordLanguage" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { wordLanguages } from '@/config/wordLanguages';
import { getLanguage } from '@/i18n/languages';
import { useSetupStore } from '@/stores/setup';

const { t } = useI18n();
const setup = useSetupStore();

// Left-to-right languages first, so the order never depends on the page direction.
const options = [...wordLanguages]
  .sort((a, b) => Number(a.dir === 'rtl') - Number(b.dir === 'rtl'))
  .map((l) => ({ label: l.name, value: l.code, style: { fontFamily: getLanguage(l.code).font.family } }));
</script>

<style scoped lang="scss">
// Same look as the interface language switcher on the home page. It is always left-to-right, so
// its end buttons keep their own rounded sides.
.word-lang-toggle {
  border: 1px solid var(--q-primary);
  border-radius: 28px;

  :deep(.q-btn) {
    line-height: 1;
    padding-top: 8px;
    padding-bottom: 8px;
    border-radius: 0;
  }

  :deep(.q-btn:first-child) {
    border-start-start-radius: 28px;
    border-end-start-radius: 28px;
  }

  :deep(.q-btn:last-child) {
    border-start-end-radius: 28px;
    border-end-end-radius: 28px;
  }
}
</style>
