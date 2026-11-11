<template>
  <div class="fullscreen bg-primary text-white text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">404</div>
      <div class="text-h4" style="opacity: 0.6">{{ t('notFound.title') }}</div>
      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="primary"
        unelevated
        rounded
        no-caps
        to="/"
        :label="t('notFound.home')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
