<template>
  <q-page v-if="state" class="column q-pa-md game-page">
    <div class="text-center q-mb-md header gold-header">
      <q-btn
        v-if="phase === 'prep' || phase === 'play'"
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
      <q-icon name="emoji_events" size="28px" class="q-mr-sm" />
      <span class="text-h5 text-weight-bold">{{ t('gold.title') }}</span>
    </div>

    <div
      v-if="phase === 'handoff'"
      class="col column items-center justify-center q-gutter-y-lg text-center"
    >
      <div class="handoff-icon" :style="{ background: teamHex(team?.color ?? '') }">
        <q-icon name="swap_horiz" size="48px" color="white" />
      </div>
      <div class="text-h5 text-weight-bold" :style="colorStyle(team?.color)">
        {{ t('turn.passTo', { team: teamName(team?.color) }) }}
      </div>
      <div class="column full-width turn-actions">
        <q-btn
          color="primary"
          size="lg"
          rounded
          no-caps
          :label="t('turn.showWord')"
          @click="showWord"
        />
        <q-btn
          outline
          size="lg"
          rounded
          no-caps
          color="primary"
          :label="t('turn.back')"
          @click="router.replace('/board')"
        />
      </div>
    </div>

    <div
      v-else-if="phase === 'prep'"
      class="col column items-center justify-center q-gutter-y-lg text-center"
    >
      <div class="text-subtitle1 text-weight-bold" :style="colorStyle(team?.color)">
        {{ t('gold.attempt', { team: teamName(team?.color) }) }}
      </div>
      <div class="word-card text-h3 text-weight-bold" :class="longWordClass(word)">
        {{ word }}
      </div>
      <q-btn
        color="primary"
        size="xl"
        rounded
        no-caps
        :label="t('turn.start')"
        @click="startPlay"
      />
    </div>

    <div v-else-if="phase === 'play'" class="col column q-gutter-y-md">
      <TimerRing
        :remaining-ms="countdown.remainingMs.value"
        :total-seconds="countdown.total.value"
        :seconds-left="countdown.secondsLeft.value"
        color="amber-8"
        low-color="amber-8"
        :pulse="countdown.running.value"
        :label="fmt(countdown.secondsLeft.value)"
      />
      <div class="col column justify-center">
        <PeekWord :word="word ?? ''" :label="t('turn.peek')" />
      </div>
      <div class="row no-wrap action-bar">
        <div class="col">
          <q-btn
            class="full-width"
            color="primary"
            size="lg"
            rounded
            no-caps
            :label="t('turn.guessed')"
            @click="resolve(true)"
          />
        </div>
        <div class="col">
          <q-btn
            class="full-width"
            :color="confirmGiveUp ? 'grey-9' : 'grey'"
            size="lg"
            rounded
            no-caps
            :label="confirmGiveUp ? t('turn.giveUpConfirm') : t('turn.giveUp')"
            @click="giveUp"
          />
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'result'" class="col column no-wrap">
      <div class="col column q-gutter-y-md q-pt-md">
        <div class="text-h5 text-weight-bold text-center">
          <q-icon
            :name="success ? 'check_circle' : 'cancel'"
            :color="success ? 'amber-8' : 'primary'"
            size="28px"
            class="q-mr-xs"
          />
          {{ success ? t('gold.result.success') : t('gold.result.failure') }}
        </div>

        <q-card flat class="soft-card q-pa-md">
          <TeamPointsRow
            :name="teamName(attemptColor)"
            :color="teamHex(attemptColor)"
            :points="t('board.points', { n: signed(success ? gold.bonus : -gold.penalty) })"
          />
        </q-card>

        <q-card flat class="soft-card q-pa-md column items-center text-center">
          <div class="text-subtitle1 wrap-anywhere">
            {{ t('turn.wordWas', { word }) }}
            <div v-if="wordHidden" class="text-caption text-grey-7">{{ t('turn.statusHidden') }}</div>
          </div>
          <q-btn
            class="q-mt-sm"
            outline
            rounded
            no-caps
            color="primary"
            :icon="wordHidden ? 'undo' : 'visibility_off'"
            :label="wordHidden ? t('turn.undoChange') : t('turn.hideWord')"
            @click="toggleHide"
          />
        </q-card>
      </div>

      <div class="column action-bar">
        <q-btn color="primary" size="lg" rounded no-caps :label="t('turn.next')" @click="next" />
      </div>
    </div>
    <PauseOverlay v-model="pauser.paused.value" @resume="pauser.resume()" @leave="leave.open.value = true" />
    <LeaveDialog v-model="leave.open.value" kind="gold" @home="exit" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import LeaveDialog from '@/components/LeaveDialog.vue';
import PauseOverlay from '@/components/PauseOverlay.vue';
import PeekWord from '@/components/PeekWord.vue';
import TeamPointsRow from '@/components/TeamPointsRow.vue';
import TimerRing from '@/components/TimerRing.vue';
import { useConfirmTap } from '@/composables/confirmTap';
import { useCountdown } from '@/composables/countdown';
import { usePause } from '@/composables/pause';
import { useLeaveGuard } from '@/composables/leaveGuard';
import { useWakeLock } from '@/composables/wakelock';
import { cue, timerCue } from '@/services/feedback';
import { goldTeam } from '@/game/game';
import { longWordClass } from '@/config/limits';
import { formatNumber, formatSigned } from '@/services/format';
import { GOLD_ID } from '@/services/customData';
import { changePoolWord, GOLD_LEVEL, revertPoolChange, type PoolChange } from '@/services/words';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

type Phase = 'loading' | 'handoff' | 'prep' | 'play' | 'result';

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const game = useGameStore();

const state = computed(() => game.state);
const gold = computed(() => state.value!.settings.gold);
const teamId = computed(() => (state.value ? goldTeam(state.value) : undefined));
const team = computed(() =>
  teamId.value === undefined ? undefined : state.value?.teams[teamId.value],
);
const fmt = (n: number) => formatNumber(n, settings.language);
const signed = (n: number) => formatSigned(n, settings.language);

const phase = ref<Phase>('loading');
const deck = ref<string[]>([]);
const word = ref<string | null>(null);
const success = ref(false);
/** The word was taken out of the gold pool from the result screen. */
const wordHidden = ref(false);
let hideChange: PoolChange | null = null;
const giveUpTap = useConfirmTap();
const confirmGiveUp = giveUpTap.armed;
/** Color of the team that just attempted, kept because the queue moves on after resolving. */
const attemptColor = ref('');
const { teamName, teamHex } = useTeamDisplay();
const colorStyle = (color: string | undefined) => ({ color: teamHex(color ?? '') });

const countdown = useCountdown(() => {
  if (phase.value === 'play') cue('end');
  resolve(false);
});
const pauser = usePause(countdown);
useWakeLock();

// While a word is shown, leaving is confirmed first. The attempt is only counted once resolved.
const leave = useLeaveGuard(() => phase.value === 'prep' || phase.value === 'play');
watch(leave.open, (open) => {
  if (open) countdown.pause();
  else if (!pauser.paused.value) countdown.resume();
});

watch(countdown.secondsLeft, (n) => {
  if (phase.value !== 'play' || !countdown.running.value) return;
  const name = timerCue(n, countdown.total.value);
  if (name) cue(name);
});

onMounted(() => {
  if (state.value?.status !== 'gold') {
    void router.replace(state.value?.status === 'finished' ? '/results' : '/');
    return;
  }
  deck.value = game.goldDeck();
  // The board offers the attempt first; with no gold words left it only offers to keep the points.
  if (deck.value.length === 0) void router.replace('/board');
  // The word stays hidden until the actor has the phone and taps Show the word.
  else phase.value = 'handoff';
});

/** Draws and shows the gold word. Does nothing when the pool is empty (every word was hidden). */
function showWord() {
  const next = deck.value.shift();
  if (next === undefined) return;
  word.value = next;
  game.markGoldSeen(next);
  wordHidden.value = false;
  hideChange = null;
  phase.value = 'prep';
}
/** Leaves the unfinished attempt; the game stays at the gold round and is saved. */
function exit() {
  leave.allow();
  void router.replace('/');
}
function startPlay() {
  phase.value = 'play';
  countdown.start(gold.value.timerSeconds);
}
function giveUp() {
  giveUpTap.tap(() => resolve(false));
}
function resolve(ok: boolean) {
  if (phase.value !== 'play') return;
  countdown.stop();
  if (ok) cue('gold');
  giveUpTap.reset();
  success.value = ok;
  attemptColor.value = team.value?.color ?? '';
  game.finishGold(ok);
  phase.value = 'result';
}
/** Hides the word from future gold rounds (a custom word is removed), or undoes that. */
function toggleHide() {
  const w = word.value;
  if (w === null) return;
  if (hideChange) {
    revertPoolChange(hideChange);
    hideChange = null;
  } else {
    hideChange = changePoolWord(game.lang, GOLD_ID, GOLD_LEVEL, w, 'hidden');
  }
  wordHidden.value = hideChange !== null;
}
function next() {
  // The board shows the next team's offer, or the game is over.
  void router.replace(state.value?.status === 'gold' ? '/board' : '/results');
}
</script>

<style scoped lang="scss">
.leave-btn,
.pause-btn {
  position: absolute;
  inset-inline-start: 4px;
}
.pause-btn {
  inset-inline-start: auto;
  inset-inline-end: 4px;
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
.gold-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-radius: 16px;
  background: rgba(255, 193, 7, 0.14);
  border-top: 5px solid #ffc107;
  color: #f9a825;
}
.word-card {
  width: 100%;
  padding: 28px 16px;
  border-radius: 20px;
  background: rgba(255, 193, 7, 0.1);
  border: 2px solid rgba(255, 193, 7, 0.6);
  overflow-wrap: anywhere;
}
@media (max-height: 500px) {
  .word-card {
    padding: 12px 16px;
  }
}
</style>
