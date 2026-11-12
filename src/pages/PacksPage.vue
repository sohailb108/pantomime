<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" class="flip-rtl" :aria-label="t('board.home')" to="/" />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('packs.title') }}</div>
    </div>

    <div class="packs-col">
      <div class="pack-list q-mb-lg">
        <q-item
          v-for="c in categories"
          :key="c.id"
          clickable
          class="pack-card"
          :to="`/packs/${c.id}`"
        >
          <q-item-section avatar>
            <div class="pack-avatar">{{ initial(c.name) }}</div>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold">{{ c.name }}</q-item-label>
            <q-item-label v-if="c.custom && !complete(c.id)" caption class="text-warning">
              {{ t('packs.incomplete') }}
            </q-item-label>
            <q-item-label v-else-if="extraCount(c.id, c.custom) > 0" caption>
              {{ t('packs.customCount', { n: fmt(extraCount(c.id, c.custom)) }) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
        </q-item>
        <q-item clickable class="pack-card gold" to="/packs/gold">
          <q-item-section avatar>
            <div class="pack-avatar gold"><q-icon name="emoji_events" color="white" /></div>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold">{{ t('packs.gold') }}</q-item-label>
            <q-item-label v-if="custom.goldWords(lang).length > 0" caption>
              {{ t('packs.customCount', { n: fmt(custom.goldWords(lang).length) }) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
        </q-item>
      </div>

      <q-btn
        class="full-width q-mb-sm"
        color="primary"
        size="lg"
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
          color="primary"
          icon="download"
          :label="t('packs.export')"
          @click="doExport"
        />
        <q-btn
          class="col"
          outline
          rounded
          no-caps
          color="primary"
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
      <div v-if="message" class="status-banner q-mt-md" :class="messageOk ? 'ok' : 'fail'">
        <q-icon
          :name="messageOk ? 'check_circle' : 'error'"
          size="24px"
          :color="messageOk ? 'positive' : 'negative'"
        />
        <div>{{ message }}</div>
      </div>
    </div>

    <q-dialog v-model="newOpen">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="add" size="22px" /></div>
          <div class="text-h6 text-weight-bold">{{ t('packs.newCategory') }}</div>
        </div>
        <div>
          <q-input
            v-model="newName"
            outlined
            dense
            autofocus
            :maxlength="MAX_NAME_LENGTH"
            :label="t('packs.categoryName')"
            @keyup.enter="create"
          />
        </div>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :label="t('setup.close')" />
          <q-btn
            rounded
            no-caps
            color="primary"
            :label="t('packs.create')"
            :disable="!newName.trim()"
            @click="create"
          />
        </div>
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
const initial = (name: string) => [...name.trim()][0] ?? '?';

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
.packs-col {
  max-width: 480px;
  margin: 0 auto;
}
.pack-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pack-card {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  min-height: 64px;
  &.gold {
    background: rgba(255, 193, 7, 0.14);
    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.6);
  }
}
.pack-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1.1rem;
  background: var(--q-primary);
  color: #fff;
  &.gold {
    background: linear-gradient(135deg, #ffd54f, #f9a825);
  }
}
</style>
