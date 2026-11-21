<template>
  <div>
    <div class="text-caption text-grey-7">
      {{ t('packs.hiddenWords', { n: fmt(words.length) }) }}
    </div>
    <div class="row q-gutter-xs">
      <q-chip v-for="w in words" :key="w" clickable icon-right="visibility" class="word-chip hidden-word" :aria-label="t('packs.showWord', { word: w })" @click="pending = w">
        {{ w }}
      </q-chip>
    </div>

    <q-dialog :model-value="pending !== null" @update:model-value="pending = null">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="visibility" size="22px" /></div>
          <div>{{ t('packs.showConfirm', { word: pending }) }}</div>
        </div>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :label="t('setup.close')" />
          <q-btn rounded no-caps color="primary" :label="t('packs.show')" @click="confirmShow" />
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatNumber } from '@/services/format';
import { useSettingsStore } from '@/stores/settings';

/** The built-in words the user hid. Only these are listed, the rest of the built-in words stay unseen. */
defineProps<{ words: readonly string[] }>();
const emit = defineEmits<{ unhide: [word: string] }>();

const { t } = useI18n();
const settings = useSettingsStore();
const fmt = (n: number) => formatNumber(n, settings.language);

const pending = ref<string | null>(null);
function confirmShow() {
  if (pending.value !== null) emit('unhide', pending.value);
  pending.value = null;
}
</script>

<style scoped lang="scss">
.word-chip {
  margin: 2px;
  height: auto;
  min-height: 32px;
  overflow-wrap: anywhere;

  :deep(.q-chip__content) {
    white-space: normal;
  }

  background: rgba(128, 128, 128, 0.2);
  color: inherit;
}

.hidden-word {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
