<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { updateReady } from '@/services/update';

const { t } = useI18n();
const $q = useQuasar();

// A new version was downloaded: offer a reload instead of waiting for the next launch.
watch(
  updateReady,
  (ready) => {
    if (!ready) return;
    $q.notify({
      message: t('update.available'),
      timeout: 0,
      position: 'bottom',
      actions: [
        { label: t('update.refresh'), color: 'white', handler: () => window.location.reload() },
      ],
    });
  },
  { immediate: true },
);
</script>
