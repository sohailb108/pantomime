<template>
  <q-page class="q-pa-md about-page">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" class="flip-rtl" :aria-label="t('help.back')" @click="goBack" />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('about.title') }}</div>
    </div>

    <div class="column items-center q-py-md">
      <AppLogo />
      <div class="text-h4 text-weight-bold text-primary q-mt-md">{{ t('appName') }}</div>
      <div class="text-subtitle1 text-grey-7">{{ t('about.version', { version }) }}</div>
      <div class="text-center q-mt-sm about-text">{{ t('about.description') }}</div>
      <div class="text-center text-grey-7 q-mt-xs">{{ t('about.author') }}</div>
    </div>

    <q-card flat class="about-card q-pa-md q-mb-md">
      <div class="text-weight-bold">{{ t('about.contactTitle') }}</div>
      <div class="about-text q-mt-xs">
        {{ t('about.contactBody') }}
        <a class="email" :href="`mailto:${EMAIL}`">{{ EMAIL }}</a>
      </div>
    </q-card>

    <q-card flat class="about-card q-pa-md">
      <div class="text-weight-bold">{{ t('about.updatesTitle') }}</div>
      <div class="about-text q-mt-xs">{{ t('about.updatesBody') }}</div>
      <div class="q-pt-md row" style="gap: 8px">
        <q-btn v-if="updateSupported" outline rounded no-caps color="primary" icon="system_update" :loading="checking" :label="t('update.check')" @click="checkUpdate" />
        <q-btn outline rounded no-caps color="primary" icon="restart_alt" :label="t('update.reset')" @click="resetOpen = true" />
      </div>
    </q-card>

    <q-dialog v-model="resetOpen" :persistent="resetting">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="restart_alt" size="22px" /></div>
          <div class="text-h6 text-weight-bold">{{ t('update.resetTitle') }}</div>
        </div>
        <p class="q-mb-none">{{ t('update.resetBody') }}</p>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :disable="resetting" :label="t('setup.close')" />
          <q-btn rounded no-caps color="negative" :loading="resetting" :label="t('update.resetConfirm')" @click="reset" />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLogo from '@/components/AppLogo.vue';
import { checkForUpdate, resetApp, updateSupported } from '@/services/update';

const EMAIL = 'pantomime@sohail.pro';
const version = __APP_VERSION__;

const { t } = useI18n();
const $q = useQuasar();
const router = useRouter();

const checking = ref(false);
async function checkUpdate() {
  checking.value = true;
  const result = await checkForUpdate();
  checking.value = false;
  // A downloaded update already shows the refresh prompt from App.vue.
  if (result === 'latest') $q.notify({ message: t('update.latest'), icon: 'check_circle' });
  else if (result === 'downloading')
    $q.notify({ message: t('update.downloading'), icon: 'downloading' });
  else if (result === 'failed') $q.notify({ message: t('update.failed'), icon: 'error_outline' });
}

const resetOpen = ref(false);
const resetting = ref(false);
async function reset() {
  resetting.value = true;
  await resetApp();
}

function goBack() {
  if (window.history.length > 1) router.back();
  else void router.push('/');
}
</script>

<style scoped lang="scss">
.about-page {
  max-width: 40rem;
  margin-inline: auto;
}

.about-card {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
}

.about-text {
  line-height: 1.6;
  opacity: 0.85;
}

.email {
  color: var(--q-primary);
  // Keep the Latin address intact inside right-to-left text.
  direction: ltr;
  unicode-bidi: isolate;
  white-space: nowrap;
}
</style>
