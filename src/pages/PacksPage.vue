<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="home" :aria-label="t('board.home')" to="/" />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('packs.title') }}</div>
    </div>

    <q-list bordered separator class="rounded-borders q-mb-md">
      <q-item v-for="c in categories" :key="c.id" clickable :to="`/packs/${c.id}`">
        <q-item-section>
          <q-item-label>{{ c.name }}</q-item-label>
          <q-item-label v-if="c.custom && !complete(c.id)" caption class="text-warning">
            {{ t('packs.incomplete') }}
          </q-item-label>
          <q-item-label v-else-if="extraCount(c.id, c.custom) > 0" caption>
            {{ t('packs.customCount', { n: fmt(extraCount(c.id, c.custom)) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
      </q-item>
      <q-item clickable to="/packs/gold">
        <q-item-section avatar><q-icon name="emoji_events" color="amber" /></q-item-section>
        <q-item-section>
          <q-item-label>{{ t('packs.gold') }}</q-item-label>
          <q-item-label v-if="custom.goldWords(lang).length > 0" caption>
            {{ t('packs.customCount', { n: fmt(custom.goldWords(lang).length) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
      </q-item>
    </q-list>

    <q-btn
      class="q-mb-md"
      color="primary"
      rounded
      no-caps
      icon="add"
      :label="t('packs.newCategory')"
      @click="openNew"
    />
    <div class="row no-wrap q-gutter-sm">
      <q-btn
        class="col"
        outline
        rounded
        no-caps
        icon="download"
        :label="t('packs.export')"
        @click="doExport"
      />
      <q-btn
        class="col"
        outline
        rounded
        no-caps
        icon="upload"
        :label="t('packs.import')"
        @click="fileInput?.click()"
      />
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="doImport"
      />
    </div>
    <q-banner v-if="message" rounded class="q-mt-md" :class="messageOk ? 'bg-green-1' : 'bg-red-1'">
      {{ message }}
    </q-banner>

    <q-dialog v-model="newOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <div class="text-h6">{{ t('packs.newCategory') }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="newName"
            outlined
            dense
            autofocus
            :maxlength="MAX_NAME_LENGTH"
            :label="t('packs.categoryName')"
            @keyup.enter="create"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps :label="t('setup.close')" />
          <q-btn
            flat
            no-caps
            color="primary"
            :label="t('packs.create')"
            :disable="!newName.trim()"
            @click="create"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { DIFFICULTIES } from '@/game/types';
import { isComplete, MAX_NAME_LENGTH } from '@/services/customData';
import { formatNumber } from '@/services/format';
import { listAllCategories } from '@/services/packs';
import { useCustomStore } from '@/stores/custom';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const custom = useCustomStore();

const lang = computed(() => settings.language);
const fmt = (n: number) => formatNumber(n, lang.value);
const categories = computed(() => listAllCategories(lang.value));

function complete(id: string): boolean {
  const c = custom.findCategory(lang.value, id);
  return !!c && isComplete(c);
}
/** Number of the user's own words in a category (all of them for a custom category). */
function extraCount(id: string, isCustom: boolean): number {
  const total = DIFFICULTIES.reduce((sum, d) => sum + custom.wordsOf(lang.value, id, d).length, 0);
  return isCustom ? 0 : total;
}

// New category dialog
const newOpen = ref(false);
const newName = ref('');
function openNew() {
  newName.value = '';
  newOpen.value = true;
}
function create() {
  const id = custom.addCategory(lang.value, newName.value);
  if (id === null) return;
  newOpen.value = false;
  void router.push(`/packs/${id}`);
}

// Export and import
const fileInput = ref<HTMLInputElement | null>(null);
const message = ref('');
const messageOk = ref(true);

function say(text: string, ok: boolean) {
  message.value = text;
  messageOk.value = ok;
}

function doExport() {
  const blob = new Blob([custom.exportJson(lang.value)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pantomime-words-${lang.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
  say(t('packs.exported'), true);
}

async function doImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const result = custom.importJson(lang.value, await file.text());
  if (result.ok) say(t('packs.imported', { n: fmt(result.added) }, result.added), true);
  else say(t(`packs.importErr.${result.error}`), false);
}
</script>

<style scoped lang="scss">
.hidden {
  display: none;
}
</style>
