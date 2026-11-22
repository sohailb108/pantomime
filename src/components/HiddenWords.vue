<template>
  <div>
    <div class="text-caption text-grey-7 caption">
      {{ t('packs.hiddenWords', { n: fmt(words.length) }) }}
    </div>
    <div class="chips">
      <q-chip v-for="w in words" :key="w" clickable class="word-chip hidden-word" :aria-label="t('packs.showWord', { word: w })" @click="pending = w">
        <span dir="auto" class="word">{{ w }}</span>
        <q-icon name="visibility" size="18px" class="eye" />
      </q-chip>
    </div>

    <q-dialog :model-value="pending !== null" @update:model-value="pending = null">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="visibility" size="22px" /></div>
          <div>{{ t('packs.showConfirm', { word: isolate(pending) }) }}</div>
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
import { formatNumber, isolate } from '@/services/format';
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
.caption {
  line-height: 1.4;
  margin-bottom: 8px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-chip {
  margin: 0;
  height: auto;
  min-height: 36px;
  padding: 4px 14px;
  background: rgba(128, 128, 128, 0.2);
  color: inherit;

  :deep(.q-chip__content) {
    white-space: normal;
    gap: 10px;
  }
}

.word {
  overflow-wrap: anywhere;
}

.eye {
  flex: none;
}

.hidden-word {
  opacity: 0.7;
}
</style>
