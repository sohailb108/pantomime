<template>
  <q-page v-if="state" class="q-pa-md">
    <div class="review-col">
      <div class="row items-center q-mb-md">
        <q-btn flat round icon="arrow_back" class="flip-rtl" :aria-label="t('review.back')" to="/results" />
        <div class="text-h5 text-weight-bold q-mx-sm">{{ t('review.title') }}</div>
      </div>

      <div v-if="groups.length === 0" class="text-body1 text-grey-7 text-center q-mt-lg">
        {{ t('review.empty') }}
      </div>

      <q-card v-for="g in groups" :key="g.id" flat class="soft-card q-mb-md">
        <div class="q-pa-md q-pb-none text-subtitle1 text-weight-bold">
          <bdi>{{ g.name }}</bdi>
        </div>
        <q-list separator>
          <q-item v-for="(w, i) in g.words" :key="i" class="review-word">
            <q-item-section avatar>
              <q-icon :name="OUTCOMES[w.outcome].icon" :color="OUTCOMES[w.outcome].color" size="sm" :aria-label="t(`review.outcome.${w.outcome}`)" />
            </q-item-section>
            <q-item-section class="wrap-anywhere">
              <span class="text-subtitle1 word" dir="auto">{{ w.word }}</span>
              <q-item-label v-if="w.translation" caption class="translation" dir="auto">{{ w.translation }}</q-item-label>
              <q-item-label caption>
                {{ t(`review.outcome.${w.outcome}`) }}<template v-if="w.hinted"> · {{ t('review.hinted') }}</template>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <span class="team-dot" :style="{ background: teamHex(w.color) }" :title="teamName(w.color)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import type { WordOutcome } from '@/game/types';
import { categoryOrFallback, listAllCategories } from '@/services/packs';
import { hintFor } from '@/services/words';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const game = useGameStore();
const state = computed(() => game.state);
const { teamName, teamHex } = useTeamDisplay();

const OUTCOMES: Record<WordOutcome, { icon: string; color: string }> = {
  guessed: { icon: 'check_circle', color: 'positive' },
  stolen: { icon: 'swap_horiz', color: 'primary' },
  skipped: { icon: 'skip_next', color: 'grey-7' },
  failed: { icon: 'cancel', color: 'negative' },
  unanswered: { icon: 'help_outline', color: 'grey-7' },
  rerolled: { icon: 'autorenew', color: 'grey-7' },
};

/** The words by category (in the order they were first played), each with its translation. */
const groups = computed(() => {
  const played = state.value?.played ?? [];
  const all = listAllCategories(game.content);
  const byCategory = new Map<string, typeof rows>();
  const rows = played.map((p) => ({
    ...p,
    color: state.value?.teams[p.teamId]?.color ?? '',
    translation: hintFor(game.content, p.categoryId, p.word, settings.language),
  }));
  for (const row of rows) {
    const list = byCategory.get(row.categoryId) ?? [];
    list.push(row);
    byCategory.set(row.categoryId, list);
  }
  return [...byCategory].map(([id, words]) => ({ id, name: categoryOrFallback(all, id).name, words }));
});

onMounted(() => {
  // Only a finished Learning game has words to review.
  if (state.value?.status !== 'finished' || game.content.kind !== 'learning') {
    void router.replace(state.value ? (state.value.status === 'finished' ? '/results' : '/board') : '/');
  }
});
</script>

<style scoped lang="scss">
.review-col {
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
}

.team-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
</style>
