<template>
  <div class="word-card q-mb-md" :style="{ '--tone': tone ?? 'var(--q-primary)' }">
    <div class="row items-center no-wrap">
      <span class="tone-dot q-mr-sm" />
      <div class="text-subtitle1 text-weight-bold col">{{ title }}</div>
      <div v-if="builtinCount !== undefined" class="builtin-chip text-caption">
        {{ t('packs.builtinCount', { n: fmt(builtinCount) }) }}
      </div>
    </div>

    <q-form class="row no-wrap items-start q-gutter-x-sm q-my-sm" @submit.prevent="add">
      <q-input
        v-model="draft"
        class="col"
        outlined
        dense
        :maxlength="MAX_WORD_LENGTH"
        :placeholder="t('packs.addWord')"
        :error="!!error"
        :error-message="error"
        hide-bottom-space
      />
      <q-btn
        type="submit"
        round
        unelevated
        color="primary"
        icon="add"
        :aria-label="t('packs.addWord')"
      />
    </q-form>

    <div v-if="words.length === 0" class="text-grey-7">{{ t('packs.noCustomWords') }}</div>
    <div v-else class="row q-gutter-xs">
      <q-chip
        v-for="w in words"
        :key="w"
        removable
        class="word-chip"
        :remove-aria-label="t('packs.removeWord', { word: w })"
        @remove="emit('remove', w)"
      >
        {{ w }}
      </q-chip>
    </div>

    <div v-if="hidden && hidden.length > 0" class="q-mt-sm">
      <div class="text-caption text-grey-7">
        {{ t('packs.hiddenWords', { n: fmt(hidden.length) }) }}
      </div>
      <div class="row q-gutter-xs">
        <q-chip
          v-for="w in hidden"
          :key="w"
          clickable
          icon-right="visibility"
          class="word-chip hidden-word"
          :aria-label="t('packs.showWord', { word: w })"
          @click="pending = w"
        >
          {{ w }}
        </q-chip>
      </div>
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
import { MAX_WORD_LENGTH, type AddResult } from '@/services/customData';
import { formatNumber } from '@/services/format';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  title: string;
  words: readonly string[];
  builtinCount?: number | undefined;
  /** Adds the word and reports what happened. */
  onAdd: (word: string) => AddResult;
  /** Built-in words the user hid. Only these are listed, the rest of the built-in words stay unseen. */
  hidden?: readonly string[] | undefined;
  /** Accent color (any CSS color) for the card's marker. */
  tone?: string | undefined;
}>();
const emit = defineEmits<{ remove: [word: string]; unhide: [word: string] }>();

const { t } = useI18n();
const settings = useSettingsStore();
const fmt = (n: number) => formatNumber(n, settings.language);

const pending = ref<string | null>(null);
function confirmShow() {
  if (pending.value !== null) emit('unhide', pending.value);
  pending.value = null;
}

const draft = ref('');
const error = ref('');

function add() {
  const result = props.onAdd(draft.value);
  error.value = result === 'ok' ? '' : t(`packs.err.${result}`);
  if (result === 'ok') draft.value = '';
}
</script>

<style scoped lang="scss">
.word-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  border-inline-start: 6px solid var(--tone);
}
.tone-dot {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--tone);
}
.builtin-chip {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.18);
}
.word-chip {
  margin: 2px;
  background: rgba(128, 128, 128, 0.2);
  color: inherit;
}
.hidden-word {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
