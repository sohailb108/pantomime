<template>
  <q-card
    flat
    bordered
    class="peek column items-center justify-center text-center q-pa-lg"
    :class="{ covered: !shown }"
    @pointerdown.prevent="shown = true"
    @pointerup="shown = false"
    @pointerleave="shown = false"
    @pointercancel="shown = false"
    @contextmenu.prevent
  >
    <div v-if="shown" class="text-h4 text-weight-bold">{{ word }}</div>
    <template v-else>
      <q-icon name="visibility_off" size="lg" />
      <div class="q-mt-sm">{{ label }}</div>
    </template>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ word: string; label: string }>();
const shown = ref(false);
</script>

<style scoped lang="scss">
.peek {
  min-height: 160px;
  user-select: none;
  touch-action: none;
  &.covered {
    background: repeating-linear-gradient(
      45deg,
      #9e9e9e33,
      #9e9e9e33 10px,
      transparent 10px,
      transparent 20px
    );
  }
}
</style>
