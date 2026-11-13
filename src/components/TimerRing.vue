<template>
  <div class="row justify-center">
    <q-circular-progress
      class="timer-ring"
      :class="{ pulse: low && pulse }"
      show-value
      :value="totalSeconds ? remainingMs / (totalSeconds * 1000) : 0"
      :min="0"
      :max="1"
      size="132px"
      :thickness="0.12"
      rounded
      reverse
      track-color="grey-4"
      :color="low ? lowColor : color"
    >
      <div class="timer text-center" :class="{ text: isText }">
        {{ label }}
      </div>
    </q-circular-progress>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  remainingMs: number;
  totalSeconds: number;
  secondsLeft: number;
  /** Ring color while more than 10 seconds are left. */
  color: string;
  /** Text in the middle, usually the formatted seconds left. */
  label: string;
  /** Ring color in the last 10 seconds: a mild warm tone, not an alarm red. */
  lowColor?: string;
  /** Gently pulse the ring in the last 10 seconds. */
  pulse?: boolean;
}>(), { lowColor: 'accent', pulse: false });

/** Seconds are big; a message such as "Time's up!" is smaller so it fits inside the ring. */
const low = computed(() => props.secondsLeft <= 10);
const isText = computed(() => props.label.length > 4);
</script>

<style scoped lang="scss">
.pulse {
  animation: ring-pulse 1s ease-in-out infinite;
}
@keyframes ring-pulse {
  50% {
    opacity: 0.55;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
}
.timer {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1;
  &.text {
    max-width: 90px;
    font-size: 1.15rem;
    line-height: 1.3;
  }
}
@media (max-height: 500px) {
  .timer-ring {
    font-size: 84px !important;
  }
  .timer {
    font-size: 1.8rem;
    &.text {
      max-width: 60px;
      font-size: 0.85rem;
    }
  }
}
</style>
