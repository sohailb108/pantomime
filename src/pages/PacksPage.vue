<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" class="flip-rtl" :aria-label="t('board.home')" to="/" />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('packs.title') }}</div>
    </div>

    <div class="packs-col">
      <div class="q-mb-md">
        <div class="text-subtitle2 text-grey-7 q-mb-xs">{{ t('setup.wordLanguage') }}</div>
        <WordLanguagePicker />
      </div>
      <div class="pack-list q-mb-lg">
        <q-item v-for="c in categories" :key="c.id" clickable class="pack-card" :to="`/packs/${c.id}`">
          <q-item-section avatar>
            <div class="pack-avatar">{{ initial(c.name) }}</div>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold" dir="auto">{{ c.name }}</q-item-label>
            <q-item-label v-if="c.custom && !complete(c.id)" caption class="text-primary">
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
            <q-item-label v-if="goldCount > 0" caption>
              {{ t('packs.customCount', { n: fmt(goldCount) }) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
        </q-item>
      </div>

      <div v-if="learningAvailable" class="learning-note q-mb-lg">
        <div class="row no-wrap items-start">
          <q-icon name="school" size="24px" color="primary" class="note-icon" />
          <div>{{ t('packs.learningNote') }}</div>
        </div>
        <div v-for="g in hiddenLearning" :key="g.level" class="level-group">
          <div class="level-label">{{ g.level.toUpperCase() }}</div>
          <HiddenWords :words="g.words" @unhide="(w) => unhideLearning(g.level, w)" />
        </div>
      </div>

      <q-btn class="full-width q-mb-sm" color="primary" size="lg" rounded no-caps icon="add" :label="t('packs.newCategory')" @click="openNew" />
      <div class="row no-wrap q-gutter-sm">
        <q-btn class="col" outline rounded no-caps color="primary" icon="download" :label="t('packs.export')" @click="doExport" />
        <q-btn class="col" outline rounded no-caps color="primary" icon="upload" :label="t('packs.import')" @click="openImport" />
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="doImport" />
      </div>
      <div v-if="message" class="status-banner q-mt-md">
        <q-icon :name="messageOk ? 'check_circle' : 'error'" size="24px" color="primary" />
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
          <q-input v-model="newName" outlined dense autofocus :maxlength="MAX_NAME_LENGTH" :label="t('packs.categoryName')" @keyup.enter="create" />
        </div>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :label="t('setup.close')" />
          <q-btn rounded no-caps color="primary" :label="t('packs.create')" :disable="!newName.trim()" @click="create" />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import HiddenWords from '@/components/HiddenWords.vue';
import WordLanguagePicker from '@/components/WordLanguagePicker.vue';
import { DIFFICULTIES, type Level } from '@/game/types';
import { GOLD_ID, isComplete, MAX_NAME_LENGTH } from '@/services/customData';
import { formatNumber } from '@/services/format';
import { normalContent } from '@/game/content';
import { hasLearning } from '@/services/learningPacks';
import { listAllCategories } from '@/services/packs';
import { GOLD_LEVEL } from '@/services/words';
import { useCustomStore } from '@/stores/custom';
import { useGameStore } from '@/stores/game';
import { useLearningStore } from '@/stores/learning';
import { useSettingsStore } from '@/stores/settings';
import { useSetupStore } from '@/stores/setup';

const { t } = useI18n();
const $q = useQuasar();
const game = useGameStore();
const router = useRouter();
const settings = useSettingsStore();
const setup = useSetupStore();
const custom = useCustomStore();
const learning = useLearningStore();

const lang = computed(() => setup.contentLang);
const fmt = (n: number) => formatNumber(n, settings.language);
const categories = computed(() => listAllCategories(normalContent(lang.value)));
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

const learningAvailable = computed(() => hasLearning(lang.value));
/** The words the user hid in learning packs, by level, each word once. */
const hiddenLearning = computed(() => {
  const byLevel = new Map<Level, string[]>();
  for (const { level, word } of learning.hiddenList(lang.value)) {
    const words = byLevel.get(level) ?? [];
    if (!words.includes(word)) words.push(word);
    byLevel.set(level, words);
  }
  return [...byLevel].map(([level, words]) => ({ level, words }));
});
/** Puts a word back at a level, in every category of the level that has it hidden. */
function unhideLearning(level: Level, word: string) {
  for (const h of learning.hiddenList(lang.value)) {
    if (h.level === level && h.word === word) {
      learning.placeWord(lang.value, level, h.categoryId, word, 'native');
    }
  }
}

const goldCount = computed(() => custom.wordsOf(lang.value, GOLD_ID, GOLD_LEVEL).length);

// New category dialog
const newOpen = ref(false);
const newName = ref('');
function openNew() {
  newName.value = '';
  newOpen.value = true;
}
function create() {
  const result = custom.addCategory(lang.value, newName.value);
  if (result === null) {
    $q.notify({ message: t('packs.createFailed'), icon: 'error_outline', timeout: 4000 });
    return;
  }
  newOpen.value = false;
  if (result.existing) $q.notify({ message: t('packs.alreadyExists'), timeout: 3000 });
  void router.push(`/packs/${result.id}`);
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
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  say(t('packs.exported'), true);
}

function openImport() {
  // Importing can merge or remove categories that a running game still uses (Learning games use no custom data).
  if (
    game.state !== null &&
    game.state.status !== 'finished' &&
    game.content.kind === 'normal' &&
    game.lang === lang.value
  ) {
    $q.notify({ message: t('packs.importInGame'), icon: 'info', timeout: 4000 });
    return;
  }
  fileInput.value?.click();
}

async function doImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  let content: string;
  try {
    content = await file.text();
  } catch {
    say(t('packs.readFailed'), false);
    return;
  }
  const result = custom.importJson(lang.value, content);
  if (result.ok) {
    let text = t('packs.imported', { n: fmt(result.added) }, result.added);
    if (result.merged > 0) {
      text += ` ${t('packs.importMerged', { n: fmt(result.merged) }, result.merged)}`;
    }
    say(text, true);
  } else say(t(`packs.importErr.${result.error}`), false);
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

.learning-note {
  border-radius: 16px;
  padding: 12px 16px;
  line-height: 1.5;
  background: rgba(128, 128, 128, 0.1);
}

.level-group {
  margin-top: 16px;
}

.level-label {
  font-weight: 700;
  margin-bottom: 2px;
}

.note-icon {
  margin-inline-end: 8px;
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
