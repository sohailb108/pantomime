<template>
  <div class="row items-center no-wrap q-gutter-x-sm">
    <q-btn round dense flat icon="remove" :disable="modelValue <= min" @click="change(-step)" />
    <div class="text-subtitle1 text-center" style="min-width: 3ch">{{ display }}</div>
    <q-btn round dense flat icon="add" :disable="modelValue >= max" @click="change(step)" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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

const settings = useSettingsStore();
const display = computed(() => formatNumber(props.modelValue, settings.language));

function change(delta: number) {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, props.modelValue + delta)));
}
</script>
