<template>
  <q-dialog v-model="open">
    <q-card class="leave-card q-pa-md">
      <div class="text-h6 text-weight-bold q-mb-sm">{{ t(`leave.${kind}Title`) }}</div>
      <div class="text-grey-8 q-mb-md">{{ t(`leave.${kind}Body`) }}</div>
      <div class="column q-gutter-y-sm">
        <q-btn
          v-close-popup
          color="primary"
          rounded
          no-caps
          :label="t('leave.resume')"
        />
        <q-btn
          v-if="kind === 'turn'"
          outline
          color="primary"
          rounded
          no-caps
          :label="t('leave.board')"
          @click="emit('board')"
        />
        <q-btn
          outline
          color="negative"
          rounded
          no-caps
          :label="t('leave.home')"
          @click="emit('home')"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{ kind: 'turn' | 'gold' }>();
const emit = defineEmits<{ board: []; home: [] }>();
const open = defineModel<boolean>({ required: true });
const { t } = useI18n();
</script>

<style scoped lang="scss">
.leave-card {
  width: 100%;
  max-width: 360px;
  border-radius: 16px;
}
</style>
