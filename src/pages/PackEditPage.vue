<template>
  <q-page v-if="ready" class="q-pa-md">
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
        <q-btn flat round icon="edit" :aria-label="t('packs.edit')" @click="openEdit" />
        <q-btn
          flat
          round
          icon="delete_outline"
          color="negative"
          :aria-label="t('packs.deleteCategory')"
          @click="deleteOpen = true"
        />
      </template>
    </div>

    <div v-if="customCategory && !complete" class="text-warning q-mb-md">
      {{ t('packs.incompleteHint') }}
    </div>

    <template v-if="isGold">
      <WordList
        :title="t('packs.gold')"
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
        :words="custom.wordsOf(lang, id, d)"
        :builtin-count="customCategory ? undefined : builtinWords(lang, id, d).length"
        :hidden="custom.hiddenOf(lang, id, d)"
        @unhide="(w) => custom.unhideWord(lang, id, d, w)"
        :on-add="(w) => custom.addWord(lang, id, d, w)"
        @remove="(w) => custom.removeWord(lang, id, d, w)"
      />
    </template>

    <q-dialog v-model="editOpen">
      <q-card style="min-width: 280px">
        <q-card-section>
          <q-input
            v-model="editName"
            outlined
            dense
            autofocus
            :maxlength="MAX_NAME_LENGTH"
            :label="t('packs.categoryName')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps :label="t('setup.close')" />
          <q-btn
            flat
            no-caps
            color="primary"
            :label="t('packs.save')"
            :disable="!editName.trim()"
            @click="saveEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteOpen">
      <q-card style="min-width: 280px">
        <q-card-section>{{ t('packs.deleteConfirm', { name: title }) }}</q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat no-caps :label="t('setup.close')" />
          <q-btn
            v-close-popup
            flat
            no-caps
            color="negative"
            :label="t('packs.deleteCategory')"
            @click="remove"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import WordList from '@/components/WordList.vue';
import { DIFFICULTIES } from '@/game/types';
import { isComplete, MAX_NAME_LENGTH } from '@/services/customData';
import { listAllCategories } from '@/services/packs';
import { builtinGoldWords, builtinWords } from '@/services/words';
import { useCustomStore } from '@/stores/custom';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const settings = useSettingsStore();
const custom = useCustomStore();

const lang = computed(() => settings.language);
const id = computed(() => String(route.params.id));
const isGold = computed(() => id.value === 'gold');
const info = computed(() => listAllCategories(lang.value).find((c) => c.id === id.value));
const ready = computed(() => isGold.value || !!info.value);
const customCategory = computed(() => custom.findCategory(lang.value, id.value));
const complete = computed(() => !!customCategory.value && isComplete(customCategory.value));
const title = computed(() => (isGold.value ? t('packs.gold') : (info.value?.name ?? '')));
const builtinGoldCount = computed(() => builtinGoldWords(lang.value).length);

onMounted(() => {
  if (!ready.value) void router.replace('/packs');
});

// Edit and delete (custom categories)
const editOpen = ref(false);
const editName = ref('');
const deleteOpen = ref(false);

function openEdit() {
  editName.value = title.value;
  editOpen.value = true;
}
function saveEdit() {
  if (custom.updateCategory(lang.value, id.value, editName.value)) {
    editOpen.value = false;
  }
}
function remove() {
  custom.removeCategory(lang.value, id.value);
  void router.replace('/packs');
}
</script>
