<template>
  <div class="row items-center no-wrap stepper">
    <q-btn
      class="stepper-btn"
      round
      outline
      color="primary"
      icon="remove"
      :aria-label="t('setup.decrease')"
      :disable="modelValue <= min"
      @pointerdown="hold(-step, $event)"
      @pointerup="release"
      @pointercancel="release"
      @pointerleave="release"
      @contextmenu.prevent
      @click="keyboardChange(-step, $event)"
    />
    <div class="stepper-value text-h6 text-center" aria-live="polite">{{ display }}</div>
    <q-btn
      class="stepper-btn"
      round
      outline
      color="primary"
      icon="add"
      :aria-label="t('setup.increase')"
      :disable="modelValue >= max"
      @pointerdown="hold(step, $event)"
      @pointerup="release"
      @pointercancel="release"
      @pointerleave="release"
      @contextmenu.prevent
      @click="keyboardChange(step, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import { formatNumber } from '@/services/format';

const props = withDefaults(
  defineProps<{ modelValue: number; min?: number; max?: number; step?: number }>(),
  {
    min: 0,
    max: 999,
    step: 1,
  },
);
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const { t } = useI18n();
const settings = useSettingsStore();
const display = computed(() => formatNumber(props.modelValue, settings.language));

/** Delay before a held button starts repeating, and the gap between repeats. */
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 100;
let delayTimer: ReturnType<typeof setTimeout> | undefined;
let repeatTimer: ReturnType<typeof setInterval> | undefined;

function change(delta: number) {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta));
  if (next === props.modelValue) release();
  else emit('update:modelValue', next);
}

/** A press changes the value once; holding it keeps changing it. */
function hold(delta: number, event: PointerEvent) {
  // Only the primary button or a touch, so a right click does not count.
  if (event.button !== 0) return;
  release();
  change(delta);
  delayTimer = setTimeout(() => {
    repeatTimer = setInterval(() => change(delta), REPEAT_MS);
  }, HOLD_DELAY_MS);
}
function release() {
  clearTimeout(delayTimer);
  clearInterval(repeatTimer);
  delayTimer = repeatTimer = undefined;
}
/** Keyboard and screen readers produce clicks with no pointer (`detail` 0). Pointer clicks were handled on press. */
function keyboardChange(delta: number, event: Event) {
  if ((event as MouseEvent).detail === 0) change(delta);
}

onBeforeUnmount(release);
</script>

<style scoped lang="scss">
.stepper {
  gap: 4px;
}
.stepper-btn {
  width: 44px;
  height: 44px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.stepper-value {
  min-width: 3.5ch;
}
</style>
