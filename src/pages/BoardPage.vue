<template>
  <q-page v-if="state" class="q-pa-md">
    <div class="board-col">
      <div class="row items-center q-mb-md">
        <q-btn flat round icon="home" :aria-label="t('board.home')" to="/" />
        <div class="text-h5 text-weight-bold q-mx-sm">{{ t('board.title') }}</div>
      </div>

      <div class="scores q-mb-md">
        <div
          v-for="team in turnOrder"
          :key="team.id"
          class="score-card text-center text-white"
          :class="{ current: team.id === state.currentTeam }"
          :style="{ background: teamHex(team.color) }"
          role="group"
          :aria-label="teamName(team.color)"
        >
          <div class="score-name">{{ teamName(team.color) }}</div>
          <div class="score-value">{{ fmt(team.score) }}</div>
        </div>
      </div>

      <div
        class="turn-pill text-weight-bold q-mb-lg"
        :style="{
          color: teamHex(state.teams[state.currentTeam]?.color ?? ''),
          borderColor: teamHex(state.teams[state.currentTeam]?.color ?? ''),
        }"
      >
        <q-icon name="play_circle" size="20px" class="q-mr-xs" />
        {{ t('board.turnOf', { team: teamName(state.teams[state.currentTeam]?.color) }) }}
      </div>

      <div v-for="cat in columns" :key="cat.id" class="board-row">
        <div class="cat-title text-weight-bold">{{ cat.name }}</div>
        <div class="tile-row">
          <template v-for="cell in cat.cells" :key="cell.d">
            <q-btn
              v-if="cell.index !== undefined"
              class="full-width tile"
              :class="{ played: !!cell.played }"
              :style="cell.played ? { background: cell.played.hex } : undefined"
              unelevated
              no-caps
              :aria-disabled="!!cell.played"
              :aria-label="t('board.points', { n: fmt(pointsOf(cell.d)) })"
              @click="pickTile(cell.index)"
            >
              <div v-if="cell.played" class="tile-played" :aria-label="cell.played.label">
                <div class="text-weight-bold">{{ cell.played.points }}</div>
                <div v-if="cell.played.stolen" class="steal-line">
                  <span class="dot" :style="{ background: cell.played.stolen.hex }" />
                  {{ cell.played.stolen.points }}
                </div>
              </div>
              <template v-else>{{ t('board.points', { n: fmt(pointsOf(cell.d)) }) }}</template>
            </q-btn>
            <div v-else class="tile-removed" />
          </template>
        </div>
      </div>
    </div>

    <q-dialog
      :model-value="!state.startRevealed"
      persistent
      maximized
      transition-show="fade"
      transition-hide="fade"
    >
      <div class="reveal" :style="{ '--team': starterHex }">
        <div class="reveal-flood" />
        <span
          v-for="n in 18"
          :key="n"
          class="spark"
          :style="{
            '--a': `${(n - 1) * 20}deg`,
            '--d': `${130 + (n % 3) * 40}px`,
            background: n % 2 ? '#fff' : teamHex(turnOrder[n % turnOrder.length]?.color ?? ''),
          }"
        />
        <div class="reveal-body">
          <div class="reveal-title text-h6 text-white">{{ t('board.firstTitle') }}</div>
          <div class="reveal-team text-h2 text-weight-bold text-white" aria-live="polite">
            {{ teamName(state.teams[state.currentTeam]?.color) }}
          </div>
          <template v-if="turnOrder.length > 2">
            <div class="reveal-late text-body1 text-white q-mt-xl" style="--delay: 1.5s">
              {{ t('board.order') }}
            </div>
            <div class="order-row reveal-late" style="--delay: 1.6s">
              <span
                v-for="(team, i) in turnOrder"
                :key="team.id"
                class="order-chip text-weight-bold"
                :style="{ background: '#fff', color: teamHex(team.color) }"
                :aria-label="teamName(team.color)"
              >
                {{ fmt(i + 1) }}
              </span>
            </div>
          </template>
          <q-btn
            class="reveal-late q-mt-xl"
            style="--delay: 1.8s"
            rounded
            no-caps
            unelevated
            size="lg"
            color="white"
            text-color="dark"
            :label="t('board.firstOk')"
            @click="game.revealStart()"
          />
        </div>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import { DIFFICULTIES, type Difficulty } from '@/game/types';
import { formatNumber, formatSigned } from '@/services/format';
import { categoryOrFallback, listAllCategories } from '@/services/packs';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const game = useGameStore();
const state = computed(() => game.state);

const { teamName, teamHex } = useTeamDisplay();

/** Teams in play order: the team that went first, then the rest, wrapping around. */
const turnOrder = computed(() => {
  const teams = state.value?.teams ?? [];
  const start = state.value?.starter ?? 0;
  return [...teams.slice(start), ...teams.slice(0, start)];
});
const fmt = (n: number) => formatNumber(n, settings.language);

// Columns follow the order tiles were built in, one per distinct category. Each column holds its
// tiles' index and played state, computed once per change instead of once per template lookup.
const columns = computed(() => {
  const tiles = state.value?.tiles ?? [];
  const indexOf = new Map(tiles.map((tile, i) => [`${tile.categoryId}:${tile.difficulty}`, i]));
  const ids = [...new Set(tiles.map((tile) => tile.categoryId))];
  const all = listAllCategories(game.lang);
  return ids.map((id) => {
    const cat = categoryOrFallback(all, id);
    const cells = DIFFICULTIES.map((d) => {
      const index = indexOf.get(`${id}:${d}`);
      return { d, index, played: index === undefined ? undefined : played(index) };
    });
    return { ...cat, cells };
  });
});

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
          points: formatSigned(
            tile.stolenPoints ?? state.value.settings.points[tile.difficulty],
            settings.language,
          ),
        }
      : undefined,
  };
}

function pickTile(index: number) {
  if (isPlayed(index)) return;
  game.pick(index);
  void router.push('/turn');
}

const starterHex = computed(() => teamHex(state.value?.teams[state.value.currentTeam]?.color ?? ''));

onMounted(() => {
  if (!game.state) void router.replace('/');
  else if (game.state.status === 'gold') void router.replace('/gold');
  else if (game.state.status === 'finished') void router.replace('/results');
});
</script>

<style scoped lang="scss">
.board-col {
  max-width: 560px;
  margin: 0 auto;
}
.scores {
  display: flex;
  gap: 8px;
}
.score-card {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 16px;
  padding: 8px 6px;
  opacity: 0.7;
  transition: opacity 0.2s;
  &.current {
    opacity: 1;
    box-shadow:
      0 0 0 3px var(--q-page-bg, #fff),
      0 0 0 5px currentColor,
      0 4px 12px rgba(0, 0, 0, 0.25);
  }
}
.score-name {
  font-size: 0.75rem;
  opacity: 0.9;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.score-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}
.turn-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-inline: auto;
  padding: 6px 16px;
  border: 2px solid;
  border-radius: 999px;
  font-size: 1.05rem;
}
// One card per category: the title, then its three difficulty tiles side by side.
.board-row {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
}
.tile-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.cat-title {
  overflow-wrap: break-word;
  padding: 0 2px;
  margin-bottom: 10px;
  font-size: 1.05rem;
}
.tile {
  border-radius: 12px;
  // Unplayed: outlined only, so the filled team colors stand out as "played".
  background: transparent;
  border: 2px solid var(--q-primary);
  color: var(--q-primary);
  min-height: 56px;
  font-size: 1.15rem;
  font-weight: 700;
  // A played tile takes the color of the team that played it (set inline).
  &.played {
    border-color: transparent;
    color: #fff;
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
.order-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
.order-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.reveal {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  overflow: hidden;
  background: #1b1b1b;
}
// The starter's colour floods the screen from the centre, then the name pops in.
.reveal-flood {
  position: absolute;
  inset: 0;
  background: var(--team);
  animation: flood 0.7s cubic-bezier(0.5, 0, 0.2, 1) 0.2s both;
}
.reveal-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
  max-width: 560px;
}
.reveal-title {
  opacity: 0.9;
  animation: rise 0.5s ease-out 0.7s both;
}
.reveal-team {
  margin-top: 12px;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  animation: pop 0.7s cubic-bezier(0.2, 1.8, 0.4, 1) 1s both;
}
.reveal-late {
  animation: rise 0.5s ease-out var(--delay) both;
}
// A burst of confetti dots from the middle as the name lands.
.spark {
  position: absolute;
  top: 50%;
  inset-inline-start: 50%;
  width: 12px;
  height: 12px;
  margin: -6px;
  border-radius: 50%;
  opacity: 0;
  animation: burst 0.9s ease-out 1s both;
}
@keyframes flood {
  from {
    clip-path: circle(0% at 50% 50%);
  }
  to {
    clip-path: circle(150% at 50% 50%);
  }
}
@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes burst {
  0% {
    opacity: 1;
    transform: rotate(var(--a)) translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--a)) translateX(var(--d)) scale(0.3);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reveal-flood,
  .reveal-title,
  .reveal-team,
  .reveal-late {
    animation: none;
  }
  .spark {
    display: none;
  }
}
.tile-removed {
  min-height: 56px;
  border: 2px dashed rgba(128, 128, 128, 0.3);
  border-radius: 12px;
}
</style>
