<template>
  <q-page v-if="state" class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="home" :aria-label="t('board.home')" to="/" />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('board.title') }}</div>
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div v-for="team in state.teams" :key="team.id" class="col">
        <div
          class="score-card text-center q-pa-sm"
          :class="{ current: team.id === state.currentTeam }"
          :style="{ background: teamHex(team.color) }"
          role="group"
          :aria-label="teamName(team.color)"
        >
          <div class="text-h5 text-white">{{ fmt(team.score) }}</div>
        </div>
      </div>
    </div>

    <div
      class="text-h6 text-center q-mb-md text-weight-bold"
      :style="{ color: teamHex(state.teams[state.currentTeam]?.color ?? '') }"
    >
      {{ t('board.turnOf', { team: teamName(state.teams[state.currentTeam]?.color) }) }}
    </div>

    <div v-for="cat in columns" :key="cat.id" class="board-row">
      <div class="cat-title text-weight-bold">{{ cat.name }}</div>
      <div class="tile-row">
        <template v-for="d in DIFFICULTIES" :key="d">
          <q-btn
            v-if="tileIndex(cat.id, d) !== undefined"
            class="full-width tile"
            :class="{ played: isPlayed(tileIndex(cat.id, d)!) }"
            :style="playedStyle(tileIndex(cat.id, d)!)"
            unelevated
            no-caps
            :aria-disabled="isPlayed(tileIndex(cat.id, d)!)"
            :aria-label="t('board.points', { n: fmt(pointsOf(d)) })"
            @click="pickTile(tileIndex(cat.id, d)!)"
          >
            <div
              v-if="played(tileIndex(cat.id, d)!)"
              class="tile-played"
              :aria-label="played(tileIndex(cat.id, d)!)!.label"
            >
              <div class="text-weight-bold">{{ played(tileIndex(cat.id, d)!)!.points }}</div>
              <div v-if="played(tileIndex(cat.id, d)!)!.stolen" class="steal-line">
                <span
                  class="dot"
                  :style="{ background: played(tileIndex(cat.id, d)!)!.stolen!.hex }"
                />
                {{ played(tileIndex(cat.id, d)!)!.stolen!.points }}
              </div>
            </div>
            <template v-else>{{ t('board.points', { n: fmt(pointsOf(d)) }) }}</template>
          </q-btn>
          <div v-else class="tile-removed" />
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import { DIFFICULTIES, type Difficulty } from '@/game/types';
import { formatNumber, formatSigned } from '@/services/format';
import { listAllCategories } from '@/services/packs';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const game = useGameStore();
const state = computed(() => game.state);

const { teamName, teamHex } = useTeamDisplay();
const fmt = (n: number) => formatNumber(n, settings.language);

// Columns follow the order tiles were built in, one per distinct category.
const columns = computed(() => {
  const ids = [...new Set(state.value?.tiles.map((tile) => tile.categoryId) ?? [])];
  const all = listAllCategories(game.lang);
  return ids.map((id) => all.find((c) => c.id === id) ?? { id, name: id, color: '#9e9e9e' });
});

function tileIndex(categoryId: string, difficulty: Difficulty): number | undefined {
  const i = state.value?.tiles.findIndex(
    (tile) => tile.categoryId === categoryId && tile.difficulty === difficulty,
  );
  return i === undefined || i < 0 ? undefined : i;
}
function pointsOf(difficulty: Difficulty): number {
  return state.value?.settings.points[difficulty] ?? difficulty;
}
function isPlayed(index: number): boolean {
  return state.value?.tiles[index]?.playedBy !== undefined;
}
/**
 * What a played tile shows: the playing team's color (the tile background), its net points, and
 * who stole it with how many points (if anyone).
 */
function played(index: number) {
  const tile = state.value?.tiles[index];
  const teams = state.value?.teams;
  if (!state.value || !teams || tile?.playedBy === undefined) return undefined;
  const by = teams[tile.playedBy]?.color;
  const stolenBy = tile.stolenBy === undefined ? undefined : teams[tile.stolenBy]?.color;
  return {
    hex: teamHex(by ?? ''),
    label: teamName(by),
    points: formatSigned(tile.points ?? 0, settings.language),
    stolen: stolenBy
      ? {
          hex: teamHex(stolenBy),
          points: formatSigned(state.value.settings.points[tile.difficulty], settings.language),
        }
      : undefined,
  };
}

function playedStyle(index: number) {
  const p = played(index);
  return p ? { background: p.hex } : undefined;
}

function pickTile(index: number) {
  if (isPlayed(index)) return;
  game.pick(index);
  void router.push('/turn');
}

onMounted(() => {
  if (!game.state) void router.replace('/');
  else if (game.state.status === 'gold') void router.replace('/gold');
  else if (game.state.status === 'finished') void router.replace('/results');
});
</script>

<style scoped lang="scss">
.score-card {
  border-radius: 4px;
  min-height: 48px;
  opacity: 0.75;
  &.current {
    opacity: 1;
    outline: 3px solid currentColor;
    outline-offset: 2px;
  }
}
// One block per category: the title, then its three difficulty tiles side by side.
.board-row {
  margin-bottom: 16px;
}
.tile-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.cat-title {
  overflow-wrap: break-word;
  padding: 4px 2px;
  margin-bottom: 8px;
  border-bottom: 3px solid rgba(128, 128, 128, 0.5);
  font-size: 1rem;
}
.tile {
  background: transparent;
  color: inherit;
  // Unplayed tiles are outlined, not filled.
  border: 2px solid rgba(128, 128, 128, 0.6);
  min-height: 56px;
  font-size: 1.1rem;
  // A played tile takes the color of the team that played it (set inline).
  &.played {
    color: #fff;
    border-color: transparent;
    // The ring marks a tile as played.
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.85);
    cursor: default;
    font-size: 1rem;
    line-height: 1.25;
    padding: 4px;
  }
}
.tile-played {
  width: 100%;
  min-width: 0;
}
.steal-line {
  font-size: 0.75rem;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  vertical-align: middle;
}
.tile-removed {
  min-height: 56px;
  border: 2px dashed rgba(128, 128, 128, 0.3);
  border-radius: 4px;
}
</style>
