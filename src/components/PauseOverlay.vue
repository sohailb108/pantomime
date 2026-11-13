<template>
  <q-dialog :model-value="modelValue" persistent maximized transition-show="fade" transition-hide="fade">
    <div class="pause-screen column items-center justify-center text-center text-white q-pa-lg">
      <q-icon name="pause_circle" size="88px" />
      <div class="text-h6 q-mt-md hint">{{ t('pause.hint') }}</div>
      <div class="column full-width actions q-mt-xl q-gutter-y-md">
        <q-btn
          rounded
          no-caps
          unelevated
          size="lg"
          color="white"
          text-color="dark"
          icon="play_arrow"
          :label="t('pause.resume')"
          @click="emit('resume')"
        />
        <q-btn
          outline
          rounded
          no-caps
          size="lg"
          color="white"
          :label="t('leave.button')"
          @click="emit('leave')"
        />
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ resume: []; leave: [] }>();
const { t } = useI18n();
</script>

<style scoped lang="scss">
.pause-screen {
  width: 100%;
  min-height: 100%;
  background: #1b1b1b;
}
.hint {
  max-width: 320px;
  opacity: 0.75;
}
.actions {
  max-width: 320px;
}
</style>
