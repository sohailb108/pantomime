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
      <div class="timer text-center" :class="{ low: secondsLeft <= 10 }">{{ label }}</div>
    </q-circular-progress>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  remainingMs: number;
  totalSeconds: number;
  secondsLeft: number;
  /** Ring color while more than 10 seconds are left. */
  color: string;
  /** Text in the middle, usually the formatted seconds left. */
  label: string;
}>();
</script>

<style scoped lang="scss">
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
}
</style>
