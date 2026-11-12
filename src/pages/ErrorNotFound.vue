<template>
  <div class="fullscreen column items-center justify-center text-center q-pa-md">
    <AppLogo />
    <div class="code text-primary">404</div>
    <div class="text-h5 text-weight-bold">{{ t('notFound.title') }}</div>
    <q-btn
      class="q-mt-lg"
      color="primary"
      size="lg"
      rounded
      no-caps
      icon="home"
      to="/"
      :label="t('notFound.home')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppLogo from '@/components/AppLogo.vue';

const { t } = useI18n();
</script>

<style scoped lang="scss">
.code {
  margin-top: 8px;
  font-size: 5rem;
  font-weight: 800;
  line-height: 1.1;
}
</style>
