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
      <q-icon name="emoji_events" size="28px" class="q-mr-sm" />
      <span class="text-h5 text-weight-bold">{{ t('gold.title') }}</span>
    </div>

    <div
      v-if="phase === 'intro'"
      class="col column items-center justify-center q-gutter-y-md text-center"
    >
      <div class="gold-medal"><q-icon name="emoji_events" size="56px" color="white" /></div>
      <div class="text-h5 text-weight-bold" :style="colorStyle(team?.color)">
        {{ t('gold.intro', { team: teamName(team?.color) }) }}
      </div>
      <div class="rules-card text-grey-8">
        {{
          t('gold.rules', {
            bonus: formatSigned(gold.bonus, settings.language),
            penalty: formatSigned(-gold.penalty, settings.language),
          })
        }}
      </div>
      <div v-if="noGoldWords" class="rules-card text-grey-8">{{ t('gold.noWords') }}</div>
      <div class="row no-wrap full-width gold-actions">
        <q-btn
          class="col"
          color="primary"
          size="lg"
          rounded
          no-caps
          :disable="noGoldWords"
          :label="t('turn.showWord')"
          @click="showWord"
        />
        <q-btn
          class="col"
          outline
          color="primary"
          size="lg"
          rounded
          no-caps
          :label="t('gold.decline')"
          @click="decline"
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
      <div class="row justify-center">
        <q-circular-progress
          class="timer-ring"
          show-value
          :value="
            countdown.total.value ? countdown.remainingMs.value / (countdown.total.value * 1000) : 0
          "
          :min="0"
          :max="1"
          size="132px"
          :thickness="0.12"
          rounded
          reverse
          track-color="grey-4"
          :color="countdown.secondsLeft.value <= 10 ? 'negative' : 'amber-8'"
        >
          <div class="timer text-center" :class="{ low: countdown.secondsLeft.value <= 10 }">
            {{ fmt(countdown.secondsLeft.value) }}
          </div>
        </q-circular-progress>
      </div>
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
            @click="resolve(true)"
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
    </div>

    <div v-else class="col column items-center justify-center q-gutter-y-md text-center">
      <div class="result-icon" :class="success ? 'ok' : 'fail'">
        <q-icon :name="success ? 'check' : 'close'" size="56px" color="white" />
      </div>
      <div class="text-h5 text-weight-bold" :style="colorStyle(attemptColor)">
        {{
          success
            ? t('gold.successTitle', { team: teamName(attemptColor), n: fmt(gold.bonus) })
            : t('gold.failTitle', { team: teamName(attemptColor) })
        }}
      </div>
      <div class="word-card text-h6">{{ t('turn.wordWas', { word }) }}</div>
      <q-btn
        class="action-bar"
        color="primary"
        size="lg"
        rounded
        no-caps
        :label="t('turn.next')"
        @click="next"
      />
    </div>
    <LeaveDialog v-model="leave.open.value" kind="gold" @home="exit" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useTeamDisplay } from '@/composables/teams';
import LeaveDialog from '@/components/LeaveDialog.vue';
import PeekWord from '@/components/PeekWord.vue';
import { useCountdown } from '@/composables/countdown';
import { useLeaveGuard } from '@/composables/leaveGuard';
import { useWakeLock } from '@/composables/wakelock';
import { cue } from '@/services/feedback';
import { goldTeam } from '@/game/game';
import { longWordClass } from '@/config/limits';
import { formatNumber, formatSigned } from '@/services/format';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

type Phase = 'intro' | 'prep' | 'play' | 'result';

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

const phase = ref<Phase>('intro');
const deck = ref<string[]>([]);
/** The gold pool is empty (every gold word was hidden), so there is nothing to attempt. */
const noGoldWords = ref(false);
const word = ref<string | null>(null);
const success = ref(false);
const confirmGiveUp = ref(false);
/** Color of the team that just attempted, kept because the queue moves on after resolving. */
const attemptColor = ref('');
const { teamName, teamHex } = useTeamDisplay();
const colorStyle = (color: string | undefined) => ({ color: teamHex(color ?? '') });
let confirmTimer: ReturnType<typeof setTimeout> | undefined;

const countdown = useCountdown(() => {
  if (phase.value === 'play') cue('end');
  resolve(false);
});
useWakeLock();

// While a word is shown, leaving is confirmed first. The attempt is only counted once resolved.
const leave = useLeaveGuard(() => phase.value === 'prep' || phase.value === 'play');
watch(leave.open, (open) => (open ? countdown.pause() : countdown.resume()));

watch(countdown.secondsLeft, (n) => {
  if (phase.value === 'play' && countdown.running.value && n > 0 && n <= 5) cue('tick');
});

onMounted(() => {
  if (state.value?.status !== 'gold') {
    void router.replace(state.value?.status === 'finished' ? '/results' : '/');
    return;
  }
  deck.value = game.goldDeck();
  noGoldWords.value = deck.value.length === 0;
});
onBeforeUnmount(() => clearTimeout(confirmTimer));

function showWord() {
  const next = deck.value.shift();
  if (next === undefined) {
    noGoldWords.value = true;
    return;
  }
  word.value = next;
  game.markGoldSeen(next);
  phase.value = 'prep';
}
/** Leaves the unfinished attempt; the game stays at the gold round and is saved. */
function exit() {
  leave.allow();
  void router.replace('/');
}
/** The team keeps its points and skips the attempt. */
function decline() {
  game.declineGold();
  if (state.value?.status !== 'gold') void router.replace('/results');
}
function startPlay() {
  phase.value = 'play';
  countdown.start(gold.value.timerSeconds);
}
function giveUp() {
  if (!confirmGiveUp.value) {
    confirmGiveUp.value = true;
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => (confirmGiveUp.value = false), 3000);
    return;
  }
  resolve(false);
}
function resolve(ok: boolean) {
  if (phase.value !== 'play') return;
  countdown.stop();
  if (ok) cue('good');
  confirmGiveUp.value = false;
  success.value = ok;
  attemptColor.value = team.value?.color ?? '';
  game.finishGold(ok);
  phase.value = 'result';
}
function next() {
  if (state.value?.status === 'gold') {
    phase.value = 'intro';
    deck.value = deck.value.length ? deck.value : game.goldDeck();
  } else {
    void router.replace('/results');
  }
}
</script>

<style scoped lang="scss">
.leave-btn {
  position: absolute;
  inset-inline-start: 4px;
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
.gold-medal,
.result-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.gold-medal {
  background: linear-gradient(135deg, #ffd54f, #f9a825);
  outline: 4px solid rgba(255, 193, 7, 0.35);
}
.result-icon.ok {
  background: var(--q-positive);
}
.result-icon.fail {
  background: var(--q-negative);
}
.gold-actions {
  gap: 12px;
  .q-btn {
    min-height: 56px;
  }
}
.rules-card {
  max-width: 420px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
}
.word-card {
  width: 100%;
  padding: 28px 16px;
  border-radius: 20px;
  background: rgba(255, 193, 7, 0.1);
  border: 2px solid rgba(255, 193, 7, 0.6);
  overflow-wrap: anywhere;
}
.timer {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1;
  &.low {
    color: var(--q-negative);
  }
}
@media (max-height: 500px) {
  .timer-ring {
    font-size: 84px !important;
  }
  .timer {
    font-size: 1.8rem;
  }
  .word-card {
    padding: 12px 16px;
  }
}
</style>
