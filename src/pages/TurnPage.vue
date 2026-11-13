<template>
  <q-page v-if="tile && team" class="column q-pa-md game-page">
    <div class="header text-center q-mb-md" :style="{ '--team': teamHex(team.color) }">
      <q-btn
        v-if="phase !== 'handoff'"
        class="leave-btn"
        flat
        round
        dense
        icon="close"
        :aria-label="t('leave.button')"
        @click="leave.open.value = true"
      />
      <q-btn
        v-if="phase === 'play' && countdown.running.value"
        class="pause-btn"
        flat
        round
        dense
        icon="pause"
        :aria-label="t('pause.button')"
        @click="pauser.pause()"
      />
      <div class="team-pill text-subtitle1 text-weight-bold" :style="{ background: teamHex(team.color) }">
        {{ teamName(team.color) }}
      </div>
      <div class="tile-chip text-body2">
        {{
          t('turn.tileInfo', {
            category: category.name,
            points: t('board.points', { n: fmt(tileValue) }),
          })
        }}
      </div>
    </div>

    <div v-if="phase !== 'result' && phase !== 'getready'" class="role-chip text-center text-body2">
      <q-icon :name="isMulti ? 'gavel' : 'sports_esports'" size="16px" class="q-mr-xs" />
      {{ isMulti ? t('turn.roleJudge') : t('turn.roleActor') }}
    </div>

    <!-- Handoff -->
    <div v-if="phase === 'handoff'" class="col column items-center justify-center q-gutter-y-lg">
      <div class="handoff-icon" :style="{ background: teamHex(team.color) }">
        <q-icon name="swap_horiz" size="48px" color="white" />
      </div>
      <div class="text-h5 text-center text-weight-bold" :style="colorOf(team.id)">
        {{ isMulti ? t('turn.passToJudge') : t('turn.passTo', { team: teamName(team.color) }) }}
      </div>
      <div class="column full-width turn-actions">
        <q-btn
          color="primary"
          size="lg"
          rounded
          no-caps
          :label="isMulti ? t('turn.startTurn') : t('turn.showWord')"
          @click="begin"
        />
        <q-btn
          outline
          size="lg"
          rounded
          no-caps
          color="primary"
          :label="t('turn.back')"
          @click="back"
        />
      </div>
    </div>

    <!-- Multi mode: short countdown before the first word -->
    <div
      v-else-if="phase === 'getready'"
      class="col column items-center justify-center q-gutter-y-md"
    >
      <div class="text-h5 text-weight-bold text-grey-7">{{ t('turn.getReady') }}</div>
      <div class="getready-number text-weight-bold" :style="colorOf(team.id)">
        {{ fmt(getReady.secondsLeft.value) }}
      </div>
    </div>

    <!-- Single mode: word shown before start -->
    <div v-else-if="phase === 'prep'" class="col column items-center justify-center q-gutter-y-lg">
      <div class="word-card text-h3 text-weight-bold text-center" :class="longWordClass(word)">
        {{ word }}
      </div>
      <div class="text-center text-grey-7 hint-text">{{ t('turn.prepHint') }}</div>
      <div class="column full-width turn-actions">
        <q-btn
          color="primary"
          size="lg"
          rounded
          no-caps
          :label="t('turn.start')"
          @click="startSingle"
        />
        <q-btn
          v-if="!rerolled && deck.length > 0"
          outline
          size="lg"
          rounded
          no-caps
          color="primary"
          icon="autorenew"
          :label="rerollLabel"
          @click="reroll"
        />
        <div v-if="!rerolled && deck.length === 0" class="text-body2 text-grey-7 text-center">
          {{ t('turn.noRerollWords') }}
        </div>
      </div>
    </div>

    <!-- Playing -->
    <div v-else-if="phase === 'play' || phase === 'timeup'" class="col column q-gutter-y-md">
      <TimerRing
        :remaining-ms="countdown.remainingMs.value"
        :total-seconds="countdown.total.value"
        :seconds-left="countdown.secondsLeft.value"
        color="primary"
        :label="phase === 'timeup' ? t('turn.timeUp') : fmt(countdown.secondsLeft.value)"
      />

      <template v-if="isMulti">
        <div v-if="phase === 'timeup'" class="text-center text-grey-7">
          {{ t('turn.finishWord') }}
        </div>
        <div class="col column items-center justify-center">
          <div class="word-card text-h3 text-weight-bold text-center" :class="longWordClass(word)">
            {{ word }}
          </div>
        </div>
        <div class="tally text-body2 text-center text-grey-7">
          {{ t('turn.tallyCorrect', { n: fmt(tally.correct) }) }} {{ skipsText }}
        </div>
        <q-btn
          v-if="phase === 'play' && history.length > 0"
          class="self-center"
          outline
          rounded
          no-caps
          color="primary"
          :label="t('turn.undoLast')"
          @click="undoLast"
        />
        <div class="row no-wrap action-bar">
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
              @click="done"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="col column justify-center">
          <PeekWord :word="word ?? ''" :label="t('turn.peek')" />
        </div>
        <div class="row no-wrap action-bar">
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
        {{ t('turn.stealTitle', { team: stealerName, n: fmt(stealValue) }) }}
      </div>
      <div class="text-grey-7">{{ t('turn.stealHint') }}</div>
      <PeekWord class="full-width" :word="word ?? ''" :label="t('turn.peek')" />
      <q-btn
        v-if="undoTo"
        outline
        size="lg"
        rounded
        no-caps
        color="primary"
        :label="t('turn.undo')"
        @click="undo"
      />
      <div class="row no-wrap full-width q-mt-lg action-bar">
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
    <div v-else class="col column no-wrap">
      <div class="col column q-gutter-y-md q-pt-md">
        <div class="text-h5 text-weight-bold text-center">
          <q-icon name="flag" color="primary" size="28px" class="q-mr-xs" />
          {{ t('turn.resultTitle') }}
        </div>

        <q-card flat class="soft-card q-pa-md">
          <div
            v-for="line in resultLines"
            :key="line.teamId"
            class="line-row q--avoid-card-border row items-center no-wrap justify-between q-mb-sm"
            :style="{ '--team': teamHex(state?.teams[line.teamId]?.color ?? '') }"
          >
            <div class="team-pill text-subtitle1 text-weight-bold" :style="pillStyle(line.teamId)">
              {{ nameOf(line.teamId) }}
            </div>
            <div class="line-points text-h5 text-weight-bold">
              {{ t('board.points', { n: signed(line.points) }) }}
            </div>
          </div>
          <div v-if="resultLines.length === 0" class="text-grey-7">{{ t('turn.noPoints') }}</div>
          <template v-if="breakdown.length > 0">
            <q-separator class="q-my-md" />
            <div class="column q-gutter-y-xs">
              <div v-for="b in breakdown" :key="b.icon" class="row items-center no-wrap">
                <q-icon :name="b.icon" :color="b.color" size="sm" class="q-mr-sm" />
                <span class="col">{{ b.label }}</span>
                <span dir="ltr" class="text-weight-bold">{{ b.value }}</span>
              </div>
            </div>
          </template>
        </q-card>

        <q-card v-if="shown.length > 0 || word || noWords" flat class="soft-card">
          <div v-if="shown.length > 0" class="q-pa-md q-pb-none text-body2 text-grey-7">
            {{ t('turn.wordsShown') }}
          </div>
          <q-list v-if="shown.length > 0" class="words-list" separator>
            <q-item v-for="w in shown" :key="w">
              <q-item-section class="text-subtitle1 wrap-anywhere">{{ w }}</q-item-section>
              <q-item-section side>
                <q-btn
                  outline
                  rounded
                  no-caps
                  color="primary"
                  size="sm"
                  :icon="hiddenNow[w] ? 'undo' : 'visibility_off'"
                  :label="hiddenNow[w] ? t('turn.hiddenUndo') : t('turn.hideShort')"
                  @click="toggleHide(w)"
                />
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else-if="!isMulti && word" class="q-pa-md text-subtitle1 wrap-anywhere">
            {{ t('turn.wordWas', { word }) }}
          </div>
          <div v-if="emptiedMsg" class="q-px-md q-py-sm text-body2 text-warning">
            {{ t('packs.emptiedHint') }}
          </div>
          <div v-if="noWords" class="q-pa-md text-grey-7">{{ t('turn.noMoreWords') }}</div>
        </q-card>
      </div>

      <div class="column action-bar q-gutter-y-md">
        <q-btn
          color="primary"
          size="lg"
          rounded
          no-caps
          :label="t('turn.next')"
          @click="finish"
        />
        <q-btn
          v-if="isMulti ? multiEnd : undoTo"
          outline
          size="lg"
          rounded
          no-caps
          color="primary"
          :label="t('turn.undo')"
          @click="isMulti ? undoEnd() : undo()"
        />
      </div>
    </div>
    <PauseOverlay v-model="pauser.paused.value" @resume="pauser.resume()" @leave="leave.open.value = true" />
    <LeaveDialog v-model="leave.open.value" kind="turn" @board="exit('/board')" @home="exit('/')" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import LeaveDialog from '@/components/LeaveDialog.vue';
import PauseOverlay from '@/components/PauseOverlay.vue';
import PeekWord from '@/components/PeekWord.vue';
import TimerRing from '@/components/TimerRing.vue';
import { useConfirmTap } from '@/composables/confirmTap';
import { useCountdown } from '@/composables/countdown';
import { usePause } from '@/composables/pause';
import { useLeaveGuard } from '@/composables/leaveGuard';
import { useWakeLock } from '@/composables/wakelock';
import { cue } from '@/services/feedback';
import {
  canSkip,
  rerollDelta,
  scoreMultiTurn,
  scoreSingleSuccess,
  singleTimer,
  stealPoints,
  stealTeam,
} from '@/game/scoring';
import type { ScoreDelta } from '@/game/types';
import { formatNumber, formatSigned } from '@/services/format';
import { categoryOrFallback, listAllCategories } from '@/services/packs';
import { longWordClass } from '@/config/limits';
import { getPool, hidePoolWord, restorePoolWord, type HideResult } from '@/services/words';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

type Phase = 'handoff' | 'getready' | 'prep' | 'play' | 'timeup' | 'steal' | 'result';

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
  return categoryOrFallback(listAllCategories(game.lang), id);
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
/** Shown when hiding emptied the word list, so the category is left out of new games. */
const emptiedMsg = ref(false);
const deltas = ref<ScoreDelta[]>([]);
const tally = ref({ correct: 0, skips: 0 });
const rerolled = ref(false);
const giveUpTap = useConfirmTap();
const confirmGiveUp = giveUpTap.armed;
const noWords = ref(false);
const bonus = ref(0);

const countdown = useCountdown(onTimeEnd);
const pauser = usePause(countdown);
/** Three-second countdown before the first word of a multi-word turn. */
const GET_READY_SECONDS = 3;
const getReady = useCountdown(startMulti);
useWakeLock();

// Once the word is shown, leaving would throw the turn away, so it is confirmed first.
const leave = useLeaveGuard(() => phase.value !== 'handoff' && phase.value !== 'result');
// The turn is already decided on the result screen: leaving it any way (home, back button) still
// scores it, so the tile is not left unplayed.
onBeforeRouteLeave(() => {
  if (phase.value === 'result') game.finish(deltas.value);
});
watch(leave.open, (open) => {
  if (open) {
    countdown.pause();
    getReady.pause();
  } else {
    // Only a running turn continues; a clock kept paused for Undo stays paused.
    if (phase.value === 'play' && !pauser.paused.value) countdown.resume();
    getReady.resume();
  }
});
watch(getReady.secondsLeft, (n) => {
  if (phase.value === 'getready' && getReady.running.value && n > 0) cue('tick');
});

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

/** Back to the board before the turn starts: the tile stays unplayed and can be picked again. */
function back() {
  game.pick(null);
  void router.replace('/board');
}

/** Leaves a started turn: nothing is scored and the tile stays unplayed. */
function exit(to: string) {
  leave.allow();
  game.pick(null);
  void router.replace(to);
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
  if (isMulti.value) {
    // The word is only drawn once the countdown is over, so nobody sees it early.
    phase.value = 'getready';
    getReady.start(GET_READY_SECONDS);
    return;
  }
  if (!draw()) {
    noWords.value = true;
    phase.value = 'result';
    return;
  }
  phase.value = 'prep';
}

function startMulti() {
  if (phase.value !== 'getready') return;
  if (!draw()) {
    noWords.value = true;
    phase.value = 'result';
    return;
  }
  phase.value = 'play';
  countdown.start(state.value!.settings.multi.turnSeconds);
}

// Multi-word mode
const multi = computed(() => state.value!.settings.multi);
const canSkipNow = computed(() => canSkip(multi.value, tally.value.skips));
const skipsText = computed(() =>
  multi.value.skipLimit === null
    ? t('turn.skipsUnlimited')
    : t('turn.skipsLeft', { n: fmt(Math.max(0, multi.value.skipLimit - tally.value.skips)) }),
);

// Undo (multi-word mode). Each Correct/Skip that drew a new word is remembered so it can be taken
// back (the clock keeps running). Ending the turn from the time-up screen can be taken back too.
interface MultiSnap {
  word: string | null;
  correct: number;
  skips: number;
}
const history = ref<(MultiSnap & { drawn: string })[]>([]);
const multiEnd = ref<MultiSnap | null>(null);
const snap = (): MultiSnap => ({ word: word.value, ...tally.value });

function multiCorrect() {
  const before = snap();
  tally.value.correct++;
  cue('good');
  if (phase.value === 'timeup') return endMulti(before);
  if (!draw()) {
    noWords.value = true;
    endMulti();
    return;
  }
  history.value.push({ ...before, drawn: word.value! });
}
function multiSkip() {
  if (!canSkipNow.value) return;
  const before = snap();
  // A skip with no replacement word has no effect, so it is not counted or charged.
  if (!draw()) {
    noWords.value = true;
    endMulti();
    return;
  }
  tally.value.skips++;
  history.value.push({ ...before, drawn: word.value! });
  cue('skip');
}
function undoLast() {
  const last = history.value.pop();
  if (!last || phase.value !== 'play') return;
  // The word drawn by that tap goes back to the front of the deck and off the shown list.
  deck.value.unshift(last.drawn);
  const i = shown.value.lastIndexOf(last.drawn);
  if (i >= 0) shown.value.splice(i, 1);
  word.value = last.word;
  tally.value = { correct: last.correct, skips: last.skips };
}
function done() {
  endMulti(snap());
}
function undoEnd() {
  const before = multiEnd.value;
  if (!before) return;
  multiEnd.value = null;
  deltas.value = [];
  word.value = before.word;
  tally.value = { correct: before.correct, skips: before.skips };
  phase.value = 'timeup';
}
function endMulti(undoable: MultiSnap | null = null) {
  multiEnd.value = undoable;
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
/** What a correct steal is worth under the game's steal setting. */
const stealValue = computed(() => stealPoints(tileValue.value, single.value));
const stealerName = computed(() => (stealer.value === null ? '' : nameOf(stealer.value)));

function reroll() {
  // Check first: `draw()` clears the current word when the deck is empty.
  if (rerolled.value || deck.value.length === 0 || !draw()) return;
  rerolled.value = true;
  deltas.value.push(...rerollDelta(team.value!.id, single.value));
}
function startSingle() {
  phase.value = 'play';
  countdown.start(singleTimer(tile.value!.difficulty, single.value));
}
// Undo (single-word mode). Scores are only saved on "Continue", so a mistaken tap is reverted by
// going back a phase, dropping the deltas that tap added and continuing the paused clock.
/** The phase Undo returns to, or null when there is nothing to undo (e.g. time ran out). */
const undoTo = ref<'play' | 'steal' | null>(null);
/** How many entries at the end of `deltas` the last tap added. */
const undoPop = ref(0);
function undo() {
  const to = undoTo.value;
  if (!to) return;
  deltas.value.splice(deltas.value.length - undoPop.value);
  undoPop.value = 0;
  bonus.value = 0;
  giveUpTap.reset();
  if (to === 'play') {
    undoTo.value = null;
    phase.value = 'play';
    countdown.resume();
  } else {
    undoTo.value = 'play';
    phase.value = 'steal';
  }
}
function guessed() {
  cue('good');
  const score = scoreSingleSuccess(tileValue.value, countdown.elapsedSeconds(), single.value);
  countdown.pause();
  bonus.value = score.bonus;
  deltas.value.push({ teamId: team.value!.id, points: score.total });
  undoTo.value = 'play';
  undoPop.value = 1;
  phase.value = 'result';
}
function giveUp() {
  giveUpTap.tap(() => failSingle());
}
function failSingle(timedOut = false) {
  // Time that ran out cannot be given back, so only a deliberate give-up can be undone.
  if (timedOut) countdown.stop();
  else countdown.pause();
  undoTo.value = timedOut ? null : 'play';
  undoPop.value = 0;
  giveUpTap.reset();
  phase.value = stealer.value === null ? 'result' : 'steal';
}
function steal(right: boolean) {
  if (right && stealer.value !== null) {
    deltas.value.push({ teamId: stealer.value, points: stealValue.value });
    undoPop.value = 1;
  } else {
    undoPop.value = 0;
  }
  undoTo.value = 'steal';
  phase.value = 'result';
}

function onTimeEnd() {
  if (phase.value !== 'play') return;
  cue('end');
  if (isMulti.value) {
    if (multi.value.lastSecondBonus && word.value) phase.value = 'timeup';
    else endMulti();
  } else {
    failSingle(true);
  }
}

// Result
const resultLines = computed(() => {
  const totals = new Map<number, number>();
  for (const d of deltas.value) totals.set(d.teamId, (totals.get(d.teamId) ?? 0) + d.points);
  return [...totals].map(([teamId, points]) => ({ teamId, points }));
});
const pillStyle = (id: number) => ({ background: teamHex(state.value?.teams[id]?.color ?? '') });
const skipCost = computed(() => tally.value.skips * (isMulti.value ? multi.value.skipPenalty : 0));
const rerollCost = computed(() =>
  rerolled.value && !isMulti.value ? single.value.rerollPenalty : 0,
);

/** Extra lines under the points: fast-guess bonus and the penalties that applied. */
const breakdown = computed(() =>
  [
    { icon: 'bolt', color: 'positive', label: t('turn.fastBonus'), n: bonus.value },
    { icon: 'skip_next', color: 'warning', label: t('turn.skipsCost'), n: -skipCost.value },
    { icon: 'autorenew', color: 'warning', label: t('turn.rerollCost'), n: -rerollCost.value },
  ]
    .filter((b) => b.n !== 0)
    .map((b) => ({ ...b, value: signed(b.n) })),
);

function toggleHide(w: string) {
  const t = tile.value;
  if (!t) return;
  const was = hiddenNow.value[w];
  if (was) {
    restorePoolWord(game.lang, t.categoryId, t.difficulty, w, was);
    hiddenNow.value[w] = undefined;
    emptiedMsg.value = false;
    return;
  }
  const result = hidePoolWord(game.lang, t.categoryId, t.difficulty, w);
  hiddenNow.value[w] = result;
  emptiedMsg.value = getPool(game.lang, t.categoryId, t.difficulty).length === 0;
}

function finish() {
  leave.allow();
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
// Top of every phase: the playing team's pill and the tile (category and points) it plays.
.soft-card {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
}
.line-row {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.08);
  border-inline-start: 6px solid var(--team);
}
.line-points {
  line-height: 1.2;
}
.header {
  position: relative;
  padding: 12px 8px 10px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  border-top: 5px solid var(--team);
}
.leave-btn,
.pause-btn {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-start: 4px;
}
.pause-btn {
  inset-inline-start: auto;
  inset-inline-end: 4px;
}
.role-chip {
  margin-bottom: 8px;
  opacity: 0.8;
}
.words-list {
  // A long turn shows many words: the list scrolls instead of being cropped.
  max-height: 40vh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.soft-card {
  flex-shrink: 0;
}
.hint-text {
  max-width: 320px;
}
.getready-number {
  font-size: 7rem;
  line-height: 1;
}
.tile-chip {
  margin-top: 4px;
  opacity: 0.8;
}
.turn-actions {
  max-width: 320px;
  gap: 12px;
  .q-btn {
    min-height: 56px;
  }
}
.handoff-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.word-card {
  width: 100%;
  padding: 28px 16px;
  border-radius: 20px;
  background: rgba(128, 128, 128, 0.1);
  border: 2px solid rgba(128, 128, 128, 0.25);
  overflow-wrap: anywhere;
}
@media (max-height: 500px) {
  .word-card {
    padding: 12px 16px;
  }
}
</style>
