<template>
  <q-page v-if="tile && team" class="column q-pa-md game-page">
    <div class="header text-center q-pa-sm q-mb-md">
      <div class="text-subtitle1">
        {{
          t('turn.tileInfo', {
            category: category.name,
            points: t('board.points', { n: fmt(tileValue) }),
          })
        }}
      </div>
      <div class="team-pill text-h6 text-weight-bold" :style="{ background: teamHex(team.color) }">
        {{ teamName(team.color) }}
      </div>
    </div>

    <!-- Handoff -->
    <div v-if="phase === 'handoff'" class="col column items-center justify-center q-gutter-y-lg">
      <div class="text-h5 text-center text-weight-bold" :style="colorOf(team.id)">
        {{ t('turn.passTo', { team: teamName(team.color) }) }}
      </div>
      <q-btn
        color="primary"
        size="xl"
        rounded
        no-caps
        :label="isMulti ? t('turn.startTurn') : t('turn.showWord')"
        @click="begin"
      />
      <q-btn flat no-caps @click="back">
        <q-icon name="arrow_back" class="flip-rtl q-mr-sm" />
        {{ t('turn.back') }}
      </q-btn>
    </div>

    <!-- Single mode: word shown before start -->
    <div v-else-if="phase === 'prep'" class="col column items-center justify-center q-gutter-y-lg">
      <div class="text-h3 text-weight-bold text-center">{{ word }}</div>
      <q-btn
        v-if="!rerolled"
        flat
        no-caps
        icon="autorenew"
        :label="rerollLabel"
        :disable="deck.length === 0"
        @click="reroll"
      />
      <q-btn
        color="primary"
        size="xl"
        rounded
        no-caps
        :label="t('turn.start')"
        @click="startSingle"
      />
    </div>

    <!-- Playing -->
    <div v-else-if="phase === 'play' || phase === 'timeup'" class="col column q-gutter-y-md">
      <div class="timer text-center" :class="{ low: countdown.secondsLeft.value <= 10 }">
        {{ phase === 'timeup' ? t('turn.timeUp') : fmt(countdown.secondsLeft.value) }}
      </div>
      <q-linear-progress
        :value="
          countdown.total.value ? countdown.remainingMs.value / (countdown.total.value * 1000) : 0
        "
        size="10px"
        rounded
        :color="countdown.secondsLeft.value <= 10 ? 'negative' : 'primary'"
      />

      <template v-if="isMulti">
        <div v-if="phase === 'timeup'" class="text-center text-grey-7">
          {{ t('turn.finishWord') }}
        </div>
        <div class="col column items-center justify-center">
          <div class="text-h3 text-weight-bold text-center">{{ word }}</div>
        </div>
        <div class="text-center text-grey-7">
          {{ fmt(tally.correct) }} ✓ ·
          {{ skipsText }}
        </div>
        <div class="row q-col-gutter-md action-bar">
          <div class="col">
            <q-btn
              class="full-width"
              color="positive"
              size="lg"
              rounded
              no-caps
              :label="t('turn.correct')"
              @click="multiCorrect"
            />
          </div>
          <div class="col">
            <q-btn
              v-if="phase === 'play'"
              class="full-width"
              color="warning"
              text-color="black"
              size="lg"
              rounded
              no-caps
              :label="t('turn.skip')"
              :disable="!canSkipNow"
              @click="multiSkip"
            />
            <q-btn
              v-else
              class="full-width"
              color="grey"
              size="lg"
              rounded
              no-caps
              :label="t('turn.done')"
              @click="endMulti"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="col column justify-center">
          <PeekWord :word="word ?? ''" :label="t('turn.peek')" />
        </div>
        <div class="row q-col-gutter-md action-bar">
          <div class="col">
            <q-btn
              class="full-width"
              color="positive"
              size="lg"
              rounded
              no-caps
              :label="t('turn.guessed')"
              @click="guessed"
            />
          </div>
          <div class="col">
            <q-btn
              class="full-width"
              :color="confirmGiveUp ? 'negative' : 'grey'"
              size="lg"
              rounded
              no-caps
              :label="confirmGiveUp ? t('turn.giveUpConfirm') : t('turn.giveUp')"
              @click="giveUp"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Steal -->
    <div
      v-else-if="phase === 'steal'"
      class="col column items-center justify-center q-gutter-y-md text-center"
    >
      <div
        class="text-h5 text-weight-bold"
        :style="stealer === null ? undefined : colorOf(stealer)"
      >
        {{ t('turn.stealTitle', { team: stealerName }) }}
      </div>
      <div class="text-grey-7">{{ t('turn.stealHint') }}</div>
      <div class="text-h4 text-weight-bold">{{ word }}</div>
      <div class="row q-col-gutter-md full-width q-mt-lg action-bar">
        <div class="col">
          <q-btn
            class="full-width"
            color="positive"
            size="lg"
            rounded
            no-caps
            :label="t('turn.stealRight')"
            @click="steal(true)"
          />
        </div>
        <div class="col">
          <q-btn
            class="full-width"
            color="negative"
            size="lg"
            rounded
            no-caps
            :label="t('turn.stealWrong')"
            @click="steal(false)"
          />
        </div>
      </div>
    </div>

    <!-- Result -->
    <div v-else class="col column items-center justify-center q-gutter-y-md text-center">
      <div class="text-h5 text-weight-bold">{{ t('turn.resultTitle') }}</div>
      <div v-if="!isMulti && word && shown.length === 0" class="text-subtitle1">
        {{ t('turn.wordWas', { word }) }}
      </div>
      <div v-if="shown.length > 0" class="column items-center q-gutter-y-xs">
        <div class="text-caption text-grey-7">
          {{ t('turn.wordsShown') }}
        </div>
        <div v-for="w in shown" :key="w" class="row items-center no-wrap">
          <span class="q-mr-sm">{{ w }}</span>
          <q-btn
            flat
            dense
            no-caps
            size="sm"
            :icon="hiddenNow[w] ? 'undo' : 'visibility_off'"
            :label="hiddenNow[w] ? t('turn.hiddenUndo') : t('turn.hideShort')"
            @click="toggleHide(w)"
          />
        </div>
        <div v-if="lastWordMsg" class="text-caption text-negative">{{ t('packs.lastWord') }}</div>
      </div>
      <div v-if="noWords" class="text-grey-7">{{ t('turn.noMoreWords') }}</div>
      <div
        v-for="line in resultLines"
        :key="line.teamId"
        class="text-h6 text-weight-bold"
        :style="colorOf(line.teamId)"
      >
        {{ t('turn.gained', { team: nameOf(line.teamId), n: signed(line.points) }) }}
      </div>
      <div v-if="bonusText" class="text-positive">{{ bonusText }}</div>
      <div v-if="skipText" class="text-warning">{{ skipText }}</div>
      <div v-if="rerollText" class="text-warning">{{ rerollText }}</div>
      <q-btn
        class="action-bar"
        color="primary"
        size="lg"
        rounded
        no-caps
        :label="t('turn.next')"
        @click="finish"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import PeekWord from '@/components/PeekWord.vue';
import { useCountdown } from '@/composables/countdown';
import { useWakeLock } from '@/composables/wakelock';
import { cue } from '@/services/feedback';
import {
  canSkip,
  rerollDelta,
  scoreMultiTurn,
  scoreSingleSuccess,
  singleTimer,
  stealTeam,
} from '@/game/scoring';
import type { ScoreDelta } from '@/game/types';
import { formatNumber, formatSigned } from '@/services/format';
import { listAllCategories } from '@/services/packs';
import { hidePoolWord, restorePoolWord, type HideResult } from '@/services/words';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

type Phase = 'handoff' | 'prep' | 'play' | 'timeup' | 'steal' | 'result';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const game = useGameStore();

const state = computed(() => game.state);
const tile = computed(() =>
  state.value && game.pickedTile !== null ? state.value.tiles[game.pickedTile] : undefined,
);
/** What the picked tile is worth under the game's points setting. */
const tileValue = computed(() =>
  tile.value && state.value ? state.value.settings.points[tile.value.difficulty] : 0,
);
const team = computed(() => state.value?.teams[state.value.currentTeam]);
const isMulti = computed(() => state.value?.mode === 'multi');
const category = computed(() => {
  const id = tile.value?.categoryId ?? '';
  return (
    listAllCategories(game.lang).find((c) => c.id === id) ?? { id, name: id, color: '#9e9e9e' }
  );
});

const fmt = (n: number) => formatNumber(n, settings.language);
const signed = (n: number) => formatSigned(n, settings.language);
const { teamName, teamHex } = useTeamDisplay();
const nameOf = (id: number) => teamName(state.value?.teams[id]?.color);
const colorOf = (id: number) => ({ color: teamHex(state.value?.teams[id]?.color ?? '') });

const phase = ref<Phase>('handoff');
const deck = ref<string[]>([]);
const word = ref<string | null>(null);
/** Every word shown this turn, for the hide buttons on the result screen. */
const shown = ref<string[]>([]);
/** Words hidden from the result screen, with what hiding changed so it can be undone. */
const hiddenNow = ref<Record<string, HideResult | undefined>>({});
const lastWordMsg = ref(false);
const deltas = ref<ScoreDelta[]>([]);
const tally = ref({ correct: 0, skips: 0 });
const rerolled = ref(false);
const confirmGiveUp = ref(false);
const noWords = ref(false);
const bonus = ref(0);
let confirmTimer: ReturnType<typeof setTimeout> | undefined;

const countdown = useCountdown(onTimeEnd);
useWakeLock();

// Tick during the last seconds of a running timer.
watch(countdown.secondsLeft, (n) => {
  if (phase.value === 'play' && countdown.running.value && n > 0 && n <= 5) cue('tick');
});

onMounted(() => {
  if (!tile.value || !team.value) {
    void router.replace(state.value ? '/board' : '/');
    return;
  }
  deck.value = game.tileDeck(tile.value.categoryId, tile.value.difficulty);
});
onBeforeUnmount(() => clearTimeout(confirmTimer));

/** Back to the board before the turn starts: the tile stays unplayed and can be picked again. */
function back() {
  game.pick(null);
  void router.replace('/board');
}

/** Takes the next word of the deck and records it as used. */
function draw(): string | null {
  const next = deck.value.shift() ?? null;
  if (next && tile.value) game.markTileSeen(tile.value.categoryId, tile.value.difficulty, next);
  word.value = next;
  if (next) shown.value.push(next);
  return next;
}

function begin() {
  if (!draw()) {
    noWords.value = true;
    phase.value = 'result';
    return;
  }
  if (isMulti.value) {
    phase.value = 'play';
    countdown.start(state.value!.settings.multi.turnSeconds);
  } else {
    phase.value = 'prep';
  }
}

// Multi-word mode
const multi = computed(() => state.value!.settings.multi);
const canSkipNow = computed(() => canSkip(multi.value, tally.value.skips));
const skipsText = computed(() =>
  multi.value.skipLimit === null
    ? t('turn.skipsUnlimited')
    : t('turn.skipsLeft', { n: fmt(Math.max(0, multi.value.skipLimit - tally.value.skips)) }),
);

function multiCorrect() {
  tally.value.correct++;
  cue('good');
  if (phase.value === 'timeup') return endMulti();
  if (!draw()) {
    noWords.value = true;
    endMulti();
  }
}
function multiSkip() {
  if (!canSkipNow.value) return;
  tally.value.skips++;
  cue('skip');
  if (!draw()) {
    noWords.value = true;
    endMulti();
  }
}
function endMulti() {
  countdown.stop();
  const points = scoreMultiTurn(tileValue.value, tally.value, multi.value);
  deltas.value = points !== 0 ? [{ teamId: team.value!.id, points }] : [];
  phase.value = 'result';
}

// Single-word mode
const single = computed(() => state.value!.settings.single);
const rerollLabel = computed(() =>
  single.value.rerollPenalty > 0
    ? t('turn.reroll', { n: signed(-single.value.rerollPenalty) })
    : t('turn.rerollFree'),
);
const stealer = computed(() => stealTeam(team.value!.id, state.value!.teams.length, single.value));
const stealerName = computed(() => (stealer.value === null ? '' : nameOf(stealer.value)));

function reroll() {
  if (rerolled.value || !draw()) return;
  rerolled.value = true;
  deltas.value.push(...rerollDelta(team.value!.id, single.value));
}
function startSingle() {
  phase.value = 'play';
  countdown.start(singleTimer(tile.value!.difficulty, single.value));
}
function guessed() {
  cue('good');
  const score = scoreSingleSuccess(tileValue.value, countdown.elapsedSeconds(), single.value);
  countdown.stop();
  bonus.value = score.bonus;
  deltas.value.push({ teamId: team.value!.id, points: score.total });
  phase.value = 'result';
}
function giveUp() {
  if (!confirmGiveUp.value) {
    confirmGiveUp.value = true;
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => (confirmGiveUp.value = false), 3000);
    return;
  }
  failSingle();
}
function failSingle() {
  countdown.stop();
  confirmGiveUp.value = false;
  phase.value = stealer.value === null ? 'result' : 'steal';
}
function steal(right: boolean) {
  if (right && stealer.value !== null) {
    deltas.value.push({ teamId: stealer.value, points: tileValue.value });
  }
  phase.value = 'result';
}

function onTimeEnd() {
  if (phase.value !== 'play') return;
  cue('end');
  if (isMulti.value) {
    if (multi.value.lastSecondBonus && word.value) phase.value = 'timeup';
    else endMulti();
  } else {
    failSingle();
  }
}

// Result
const resultLines = computed(() => {
  const totals = new Map<number, number>();
  for (const d of deltas.value) totals.set(d.teamId, (totals.get(d.teamId) ?? 0) + d.points);
  return [...totals].map(([teamId, points]) => ({ teamId, points }));
});
const bonusText = computed(() =>
  bonus.value > 0 ? t('turn.fastBonus', { n: signed(bonus.value) }) : '',
);
const skipText = computed(() => {
  const cost = tally.value.skips * (isMulti.value ? multi.value.skipPenalty : 0);
  return cost > 0 ? t('turn.skipsCost', { n: signed(-cost) }) : '';
});

const rerollText = computed(() => {
  const cost = rerolled.value && !isMulti.value ? single.value.rerollPenalty : 0;
  return cost > 0 ? t('turn.rerollCost', { n: signed(-cost) }) : '';
});

function toggleHide(w: string) {
  const t = tile.value;
  if (!t) return;
  const was = hiddenNow.value[w];
  if (was) {
    restorePoolWord(game.lang, t.categoryId, t.difficulty, w, was);
    hiddenNow.value[w] = undefined;
    lastWordMsg.value = false;
    return;
  }
  const result = hidePoolWord(game.lang, t.categoryId, t.difficulty, w);
  lastWordMsg.value = result === null;
  if (result) hiddenNow.value[w] = result;
}

function finish() {
  game.finish(deltas.value);
  const status = state.value?.status;
  void router.replace(status === 'gold' ? '/gold' : status === 'finished' ? '/results' : '/board');
}
</script>

<style scoped lang="scss">
.team-pill {
  display: inline-block;
  color: #fff;
  padding: 2px 16px;
  border-radius: 16px;
}
.header {
  border-bottom: 3px solid rgba(128, 128, 128, 0.5);
}
.timer {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1;
  &.low {
    color: var(--q-negative);
  }
}
</style>
