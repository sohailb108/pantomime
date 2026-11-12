<template>
  <q-page v-if="ready" class="q-pa-md">
    <div class="edit-col">
      <div class="row items-center q-mb-md no-wrap">
        <q-btn
          flat
          round
          icon="arrow_back"
          class="flip-rtl"
          :aria-label="t('setup.back')"
          to="/packs"
        />
        <q-icon v-if="isGold" name="emoji_events" color="amber" size="sm" class="q-mx-sm" />
        <div class="text-h5 text-weight-bold col ellipsis">{{ title }}</div>
        <template v-if="customCategory">
          <q-btn
            outline
            round
            dense
            icon="edit"
            color="primary"
            class="q-mx-xs"
            :aria-label="t('packs.edit')"
            @click="openEdit"
          />
          <q-btn
            outline
            round
            dense
            icon="delete_outline"
            color="negative"
            :aria-label="t('packs.deleteCategory')"
            @click="deleteOpen = true"
          />
        </template>
      </div>

      <div v-if="customCategory && !complete" class="hint-card q-mb-md">
        <q-icon name="info" color="warning" size="24px" />
        <div>{{ t('packs.incompleteHint') }}</div>
      </div>

      <div v-if="builtinEmpty" class="hint-card q-mb-md">
        <q-icon name="info" color="warning" size="24px" />
        <div>{{ t('packs.emptyBuiltinHint') }}</div>
      </div>

      <template v-if="isGold">
        <WordList
          :title="t('packs.gold')"
          tone="#ffc107"
          :words="custom.goldWords(lang)"
          :builtin-count="builtinGoldCount"
          :hidden="custom.hiddenGold(lang)"
          @unhide="(w) => custom.unhideGold(lang, w)"
          :on-add="(w) => custom.addGold(lang, w)"
          @remove="(w) => custom.removeGold(lang, w)"
        />
      </template>
      <template v-else>
        <WordList
          v-for="d in DIFFICULTIES"
          :key="d"
          :title="t(`packs.difficulty${d}`)"
          :tone="TONES[d]"
          :words="custom.wordsOf(lang, id, d)"
          :builtin-count="customCategory ? undefined : builtinWords(lang, id, d).length"
          :hidden="custom.hiddenOf(lang, id, d)"
          @unhide="(w) => custom.unhideWord(lang, id, d, w)"
          :on-add="(w) => custom.addWord(lang, id, d, w)"
          @remove="(w) => removeWord(d, w)"
        />
      </template>
    </div>

    <q-dialog v-model="editOpen">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="edit" size="22px" /></div>
          <div class="text-h6 text-weight-bold">{{ t('packs.categoryName') }}</div>
        </div>
        <div>
          <q-input
            v-model="editName"
            outlined
            dense
            autofocus
            :maxlength="MAX_NAME_LENGTH"
            :label="t('packs.categoryName')"
          />
        </div>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :label="t('setup.close')" />
          <q-btn
            rounded
            no-caps
            color="primary"
            :label="t('packs.save')"
            :disable="!editName.trim()"
            @click="saveEdit"
          />
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteOpen">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon negative"><q-icon name="delete" size="22px" /></div>
          <div>
            {{ inActiveGame ? t('packs.deleteInGame') : t('packs.deleteConfirm', { name: title }) }}
          </div>
        </div>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :label="t('setup.close')" />
          <q-btn
            v-if="!inActiveGame"
            v-close-popup
            rounded
            no-caps
            color="negative"
            :label="t('packs.deleteCategory')"
            @click="remove"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
// Marker color of each difficulty card: easy, medium, hard.
const TONES: Record<number, string> = { 1: '#21ba45', 2: '#f2c037', 3: '#c10015' };
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import WordList from '@/components/WordList.vue';
import { DIFFICULTIES, type Difficulty } from '@/game/types';
import { isComplete, MAX_NAME_LENGTH } from '@/services/customData';
import { listAllCategories } from '@/services/packs';
import { builtinGoldWords, builtinWords, getPool } from '@/services/words';
import { useCustomStore } from '@/stores/custom';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const settings = useSettingsStore();
const custom = useCustomStore();
const game = useGameStore();

const lang = computed(() => settings.language);
const id = computed(() => String(route.params.id));
const isGold = computed(() => id.value === 'gold');
const info = computed(() => listAllCategories(lang.value).find((c) => c.id === id.value));
const ready = computed(() => isGold.value || !!info.value);
const customCategory = computed(() => custom.findCategory(lang.value, id.value));
const complete = computed(() => !!customCategory.value && isComplete(customCategory.value));
// A built-in category with a level whose words are all hidden is left out of new games.
const builtinEmpty = computed(
  () =>
    !isGold.value &&
    !customCategory.value &&
    DIFFICULTIES.some((d) => getPool(lang.value, id.value, d).length === 0),
);
const title = computed(() => (isGold.value ? t('packs.gold') : (info.value?.name ?? '')));
const builtinGoldCount = computed(() => builtinGoldWords(lang.value).length);

onMounted(() => {
  if (!ready.value) void router.replace('/packs');
});

// Edit and delete (custom categories)
const editOpen = ref(false);
const editName = ref('');
const deleteOpen = ref(false);
// A game that is still running keeps tiles for this category, so it cannot be deleted meanwhile.
const inActiveGame = computed(
  () =>
    game.state !== null &&
    game.state.status !== 'finished' &&
    game.lang === lang.value &&
    game.state.tiles.some((tile) => tile.categoryId === id.value),
);

/** Removing a word can empty a pool that the running game's tiles use, so it waits until the game ends. */
function removeWord(difficulty: Difficulty, word: string) {
  if (customCategory.value && inActiveGame.value) {
    $q.notify({ message: t('packs.editInGame'), type: 'warning', timeout: 4000 });
    return;
  }
  custom.removeWord(lang.value, id.value, difficulty, word);
}

function openEdit() {
  editName.value = title.value;
  editOpen.value = true;
}
function saveEdit() {
  const result = custom.updateCategory(lang.value, id.value, editName.value);
  if (result === 'ok') editOpen.value = false;
  else if (result === 'exists') $q.notify({ message: t('packs.nameTaken'), type: 'negative' });
}
function remove() {
  custom.removeCategory(lang.value, id.value);
  void router.replace('/packs');
}
</script>

<style scoped lang="scss">
.edit-col {
  max-width: 560px;
  margin: 0 auto;
}
.hint-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  border-inline-start: 4px solid #f2c037;
  background: rgba(251, 192, 45, 0.15);
}
</style>
