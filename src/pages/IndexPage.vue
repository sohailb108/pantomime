<template>
  <q-page class="column items-center justify-center q-pa-md q-gutter-y-md">
    <div class="text-h3 text-weight-bold text-primary">{{ t('appName') }}</div>
    <div class="text-subtitle1 text-center">{{ t('tagline') }}</div>

    <q-btn
      v-if="canResume"
      color="primary"
      size="lg"
      rounded
      no-caps
      :label="t('home.resume')"
      to="/board"
    />
    <q-btn
      :color="canResume ? undefined : 'primary'"
      :outline="canResume"
      size="lg"
      rounded
      no-caps
      :label="t('home.newGame')"
      to="/setup"
    />

    <q-btn flat rounded no-caps icon="edit_note" :label="t('home.packs')" to="/packs" />

    <q-btn flat rounded no-caps icon="help_outline" :label="t('home.help')" to="/help" />

    <q-btn
      v-if="installAvailable || iosHint"
      flat
      rounded
      no-caps
      icon="install_mobile"
      :label="t('home.install')"
      @click="install"
    />
    <q-btn flat rounded no-caps icon="share" :label="t('home.share')" @click="share" />

    <q-dialog v-model="iosOpen">
      <q-card class="q-pa-md" style="max-width: 360px">
        <div class="text-h6">{{ t('home.install') }}</div>
        <p class="q-mt-md q-mb-none">{{ t('home.iosInstall') }}</p>
        <q-card-actions align="right">
          <q-btn flat no-caps :label="t('home.ok')" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-btn-toggle
      dir="ltr"
      class="lang-toggle"
      v-model="language"
      rounded
      unelevated
      toggle-color="primary"
      :options="languageOptions"
    />
    <div
      class="row items-center no-wrap q-gutter-sm"
      role="radiogroup"
      :aria-label="t('settings.palette')"
    >
      <span class="text-body2">{{ t('settings.palette') }}</span>
      <q-btn
        v-for="p in PALETTES"
        :key="p.id"
        round
        unelevated
        size="sm"
        role="radio"
        :aria-checked="settings.palette === p.id"
        :aria-label="t(`settings.palettes.${p.id}`)"
        :style="{ background: p.primary }"
        :icon="settings.palette === p.id ? 'check' : undefined"
        text-color="white"
        @click="settings.setPalette(p.id)"
      />
    </div>
    <q-toggle v-model="dark" :label="t('settings.dark')" />
    <q-toggle v-model="sound" :label="t('settings.sound')" />
    <q-toggle v-model="vibration" :label="t('settings.vibration')" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { PALETTES } from '@/config/palettes';
import { languages } from '@/i18n/languages';
import { installAvailable, needsIosHint, promptInstall } from '@/services/install';
import { shareApp } from '@/services/share';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const $q = useQuasar();
const settings = useSettingsStore();
const game = useGameStore();

const canResume = computed(() => !!game.state && game.state.status !== 'finished');

// Left-to-right languages first, so the order never depends on the page direction.
const languageOptions = [...languages]
  .sort((a, b) => Number(a.dir === 'rtl') - Number(b.dir === 'rtl'))
  .map((l) => ({ label: l.name, value: l.code }));
const language = computed({
  get: () => settings.language,
  set: (v: string) => settings.setLanguage(v),
});
const dark = computed({
  get: () => settings.dark,
  set: (v: boolean) => settings.setDark(v),
});
const iosHint = needsIosHint();
const iosOpen = ref(false);

async function install() {
  if (!(await promptInstall())) iosOpen.value = true;
}

async function share() {
  const result = await shareApp(t('appName'), t('home.shareText'));
  if (result === 'copied') $q.notify({ message: t('home.linkCopied'), timeout: 2000 });
  else if (result === 'failed') $q.notify({ message: t('home.shareFailed'), type: 'negative' });
}

const sound = computed({
  get: () => settings.sound,
  set: (v: boolean) => settings.setSound(v),
});
const vibration = computed({
  get: () => settings.vibration,
  set: (v: boolean) => settings.setVibration(v),
});
</script>

<style scoped lang="scss">
// The switcher is always left-to-right, so its end buttons keep their own rounded sides.
.lang-toggle :deep(.q-btn) {
  border-radius: 0;
}
.lang-toggle :deep(.q-btn:first-child) {
  border-start-start-radius: 28px;
  border-end-start-radius: 28px;
}
.lang-toggle :deep(.q-btn:last-child) {
  border-start-end-radius: 28px;
  border-end-end-radius: 28px;
}
</style>
