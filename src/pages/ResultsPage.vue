<template>
  <q-page v-if="state" class="column q-pa-md">
    <div class="results-col">
      <div class="hero text-center">
        <div class="medal"><q-icon name="emoji_events" size="56px" color="white" /></div>
        <div class="text-h5 text-weight-bold q-mt-md">{{ t('results.title') }}</div>
        <div
          class="winner-pill text-h6 text-weight-bold"
          :style="winners.length === 1 ? { background: teamHex(winners[0]!.color) } : undefined"
          :class="{ tie: winners.length !== 1 }"
        >
          {{
            winners.length === 1
              ? t('results.winner', { team: teamName(winners[0]!.color) })
              : t('results.tie')
          }}
        </div>
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

      <div class="column q-gutter-y-sm q-mt-lg q-pb-md">
        <q-btn
          color="primary"
          size="lg"
          rounded
          no-caps
          icon="replay"
          :label="t('results.playAgain')"
          to="/setup"
        />
        <q-btn
          outline
          color="primary"
          size="lg"
          rounded
          no-caps
          :label="t('results.home')"
          to="/"
        />
      </div>
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
.results-col {
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
}
.hero {
  padding: 8px 0 20px;
}
.medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd54f, #f9a825);
  outline: 4px solid rgba(255, 193, 7, 0.35);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.winner-pill {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 20px;
  border-radius: 999px;
  color: #fff;
  &.tie {
    background: #f9a825;
  }
}
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
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  border-inline-start: 10px solid var(--team);
  &.winner {
    padding: 16px 14px;
    background: rgba(255, 193, 7, 0.18);
    box-shadow: 0 0 0 2px #ffc107;
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
    width: 42px;
    height: 42px;
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
.winner .score {
  font-size: 2rem;
}
</style>
