<template>
  <div class="row justify-center">
    <q-circular-progress
      class="timer-ring"
      show-value
      :value="totalSeconds ? remainingMs / (totalSeconds * 1000) : 0"
      :min="0"
      :max="1"
      size="132px"
      :thickness="0.12"
      rounded
      reverse
      track-color="grey-4"
      :color="secondsLeft <= 10 ? 'negative' : color"
    >
      <div class="timer text-center" :class="{ low: secondsLeft <= 10, text: isText }">
        {{ label }}
      </div>
    </q-circular-progress>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  remainingMs: number;
  totalSeconds: number;
  secondsLeft: number;
  /** Ring color while more than 10 seconds are left. */
  color: string;
  /** Text in the middle, usually the formatted seconds left. */
  label: string;
}>();

/** Seconds are big; a message such as "Time's up!" is smaller so it fits inside the ring. */
const isText = computed(() => props.label.length > 4);
</script>

<style scoped lang="scss">
.timer {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1;
  &.low {
    color: var(--q-negative);
  }
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
