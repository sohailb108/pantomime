<template>
  <q-page v-if="state" class="column q-pa-md">
    <div class="text-h4 text-weight-bold text-center q-mb-md text-primary">
      {{ t('results.title') }}
    </div>
    <div
      class="text-h6 text-center text-weight-bold q-mb-md"
      :style="winners.length === 1 ? { color: teamHex(winners[0]!.color) } : undefined"
    >
      {{
        winners.length === 1
          ? t('results.winner', { team: teamName(winners[0]!.color) })
          : t('results.tie')
      }}
    </div>

    <div class="ranking">
      <div
        v-for="r in ranking"
        :key="r.teamId"
        class="rank-card"
        :class="{ winner: r.rank === 1 }"
        :style="{ '--team': teamHex(r.color) }"
      >
        <div class="rank-badge">{{ fmt(r.rank) }}</div>
        <div class="team-name">{{ teamName(r.color) }}</div>
        <bdi class="score">{{ fmt(r.score) }}</bdi>
      </div>
    </div>

    <div class="row justify-center q-gutter-md q-mt-lg">
      <q-btn
        color="primary"
        size="lg"
        rounded
        no-caps
        :label="t('results.playAgain')"
        to="/setup"
      />
      <q-btn flat size="lg" rounded no-caps :label="t('results.home')" to="/" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import { rankTeams } from '@/game/ranking';
import { formatNumber } from '@/services/format';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const game = useGameStore();
const state = computed(() => game.state);

const ranking = computed(() => (state.value ? rankTeams(state.value.teams) : []));
const winners = computed(() => ranking.value.filter((r) => r.rank === 1));
const { teamName, teamHex } = useTeamDisplay();
const fmt = (n: number) => formatNumber(n, settings.language);

onMounted(() => {
  if (state.value?.status !== 'finished') void router.replace(state.value ? '/board' : '/');
});
</script>

<style scoped lang="scss">
.ranking {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-inline-start: 10px solid var(--team);
  &.winner {
    background: rgba(255, 193, 7, 0.15);
    border-color: #ffc107;
    border-inline-start-color: var(--team);
  }
}
.rank-badge {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: #bdbdbd;
  color: #000;
  .winner & {
    background: #ffc107;
  }
}
.team-name {
  flex: 1;
  font-size: 1.15rem;
  font-weight: 700;
}
.score {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--team);
  unicode-bidi: isolate;
}
</style>
