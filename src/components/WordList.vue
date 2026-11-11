<template>
  <div class="q-mb-lg">
    <div class="row items-baseline">
      <div class="text-subtitle1 text-weight-bold col">{{ title }}</div>
      <div v-if="builtinCount !== undefined" class="text-caption text-grey-7">
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
        dense
        color="grey-3"
        text-color="black"
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
          dense
          icon-right="visibility"
          color="grey-5"
          text-color="black"
          class="hidden-word"
          :aria-label="t('packs.showWord', { word: w })"
          @click="pending = w"
        >
          {{ w }}
        </q-chip>
      </div>
    </div>

    <q-dialog :model-value="pending !== null" @update:model-value="pending = null">
      <q-card style="min-width: 280px">
        <q-card-section>{{ t('packs.showConfirm', { word: pending }) }}</q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps :label="t('setup.close')" />
          <q-btn flat no-caps color="primary" :label="t('packs.show')" @click="confirmShow" />
        </q-card-actions>
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
.hidden-word {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
