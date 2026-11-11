<template>
  <q-page v-if="state" class="column q-pa-md game-page">
    <div class="text-center q-pa-sm q-mb-md header gold-header">
      <div class="text-h5 text-weight-bold">{{ t('gold.title') }}</div>
    </div>

    <div
      v-if="phase === 'intro'"
      class="col column items-center justify-center q-gutter-y-md text-center"
    >
      <q-icon name="emoji_events" size="72px" color="amber" />
      <div class="text-h5 text-weight-bold" :style="colorStyle(team?.color)">
        {{ t('gold.intro', { team: teamName(team?.color) }) }}
      </div>
      <div class="text-grey-7">
        {{
          t('gold.rules', {
            bonus: formatSigned(gold.bonus, settings.language),
            penalty: formatSigned(-gold.penalty, settings.language),
          })
        }}
      </div>
      <q-btn
        color="primary"
        size="xl"
        rounded
        no-caps
        :label="t('turn.showWord')"
        @click="showWord"
      />
      <q-btn flat no-caps :label="t('gold.decline')" @click="decline" />
    </div>

    <div
      v-else-if="phase === 'prep'"
      class="col column items-center justify-center q-gutter-y-lg text-center"
    >
      <div class="text-subtitle1 text-weight-bold" :style="colorStyle(team?.color)">
        {{ t('gold.attempt', { team: teamName(team?.color) }) }}
      </div>
      <div class="text-h3 text-weight-bold">{{ word }}</div>
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
      <div class="timer text-center" :class="{ low: countdown.secondsLeft.value <= 10 }">
        {{ fmt(countdown.secondsLeft.value) }}
      </div>
      <q-linear-progress
        :value="
          countdown.total.value ? countdown.remainingMs.value / (countdown.total.value * 1000) : 0
        "
        size="10px"
        rounded
        :color="countdown.secondsLeft.value <= 10 ? 'negative' : 'primary'"
      />
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
      <div class="text-h5 text-weight-bold" :style="colorStyle(attemptColor)">
        {{
          success
            ? t('gold.successTitle', { team: teamName(attemptColor), n: fmt(gold.bonus) })
            : t('gold.failTitle', { team: teamName(attemptColor) })
        }}
      </div>
      <div class="text-subtitle1">{{ t('turn.wordWas', { word }) }}</div>
      <q-btn class="action-bar" color="primary" size="lg" rounded no-caps :label="t('turn.next')" @click="next" />
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
import { goldTeam } from '@/game/game';
import { singleTimer } from '@/game/scoring';
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

watch(countdown.secondsLeft, (n) => {
  if (phase.value === 'play' && countdown.running.value && n > 0 && n <= 5) cue('tick');
});

onMounted(() => {
  if (state.value?.status !== 'gold') {
    void router.replace(state.value?.status === 'finished' ? '/results' : '/');
    return;
  }
  deck.value = game.goldDeck();
});
onBeforeUnmount(() => clearTimeout(confirmTimer));

function showWord() {
  word.value = deck.value.shift() ?? '';
  if (word.value) game.markGoldSeen(word.value);
  phase.value = 'prep';
}
/** The team keeps its points and skips the attempt. */
function decline() {
  game.declineGold();
  if (state.value?.status !== 'gold') void router.replace('/results');
}
function startPlay() {
  phase.value = 'play';
  countdown.start(singleTimer(3, state.value!.settings.single));
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
.gold-header {
  border-bottom: 3px solid #ffc107;
  color: #f9a825;
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
