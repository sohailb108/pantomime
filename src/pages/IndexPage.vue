<template>
  <q-page class="home column items-center q-pa-md">
    <div class="home-col column no-wrap full-width">
      <div dir="ltr" class="row items-center justify-between no-wrap q-pt-sm">
        <q-btn-toggle
          class="lang-toggle"
          v-model="language"
          rounded
          unelevated
          no-caps
          toggle-color="primary"
          :options="languageOptions"
        />
        <q-btn flat round color="primary" icon="share" :aria-label="t('home.share')" @click="share">
          <q-tooltip>{{ t('home.share') }}</q-tooltip>
        </q-btn>
      </div>

      <div class="column items-center q-py-lg">
        <AppLogo />
        <div class="text-h3 text-weight-bold text-primary q-mt-md">{{ t('appName') }}</div>
        <div class="text-subtitle1 text-center text-grey-7">{{ t('tagline') }}</div>
      </div>

      <div class="column q-gutter-y-sm">
        <q-btn
          v-if="canResume"
          color="primary"
          size="lg"
          rounded
          no-caps
          icon="play_arrow"
          :label="t('home.resume')"
          to="/board"
        />
        <q-btn
          :color="canResume ? undefined : 'primary'"
          :outline="canResume"
          size="lg"
          rounded
          no-caps
          icon="add"
          :label="t('home.newGame')"
          to="/setup"
        />
      </div>

      <q-card flat class="home-card q-mt-lg">
        <q-list separator>
          <q-item clickable to="/packs">
            <q-item-section avatar>
              <div class="item-icon"><q-icon name="edit_note" color="white" size="20px" /></div>
            </q-item-section>
            <q-item-section>{{ t('home.packs') }}</q-item-section>
            <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
          </q-item>
          <q-item clickable to="/help">
            <q-item-section avatar>
              <div class="item-icon"><q-icon name="help_outline" color="white" size="20px" /></div>
            </q-item-section>
            <q-item-section>{{ t('home.help') }}</q-item-section>
            <q-item-section side><q-icon name="chevron_right" class="flip-rtl" /></q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <div class="text-subtitle2 text-primary text-weight-bold q-mt-lg q-mb-xs q-px-xs">
        {{ t('home.settings') }}
      </div>
      <q-card flat class="home-card">
        <q-list separator>
          <q-item>
            <q-item-section avatar>
              <div class="item-icon"><q-icon name="palette" color="white" size="20px" /></div>
            </q-item-section>
            <q-item-section>{{ t('settings.palette') }}</q-item-section>
            <q-item-section side>
              <div
                class="row no-wrap q-gutter-xs"
                role="radiogroup"
                :aria-label="t('settings.palette')"
              >
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
            </q-item-section>
          </q-item>
          <q-item tag="label" v-ripple>
            <q-item-section avatar>
              <div class="item-icon"><q-icon name="dark_mode" color="white" size="20px" /></div>
            </q-item-section>
            <q-item-section>{{ t('settings.dark') }}</q-item-section>
            <q-item-section side><q-toggle v-model="dark" /></q-item-section>
          </q-item>
          <q-item tag="label" v-ripple>
            <q-item-section avatar>
              <div class="item-icon"><q-icon name="volume_up" color="white" size="20px" /></div>
            </q-item-section>
            <q-item-section>{{ t('settings.sound') }}</q-item-section>
            <q-item-section side><q-toggle v-model="sound" /></q-item-section>
          </q-item>
          <q-item tag="label" v-ripple>
            <q-item-section avatar>
              <div class="item-icon"><q-icon name="vibration" color="white" size="20px" /></div>
            </q-item-section>
            <q-item-section>{{ t('settings.vibration') }}</q-item-section>
            <q-item-section side><q-toggle v-model="vibration" /></q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <div class="row justify-center q-gutter-sm q-mt-md q-pb-md">
        <q-btn
          v-if="installAvailable || iosHint"
          outline
          rounded
          no-caps
          icon="install_mobile"
          color="primary"
          :label="t('home.install')"
          @click="install"
        />
      </div>
    </div>

    <q-dialog v-model="iosOpen">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="install_mobile" size="22px" /></div>
          <div class="text-h6 text-weight-bold">{{ t('home.install') }}</div>
        </div>
        <p class="q-mb-none">{{ t('home.iosInstall') }}</p>
        <div class="dialog-actions">
          <q-btn color="primary" rounded no-caps :label="t('home.ok')" v-close-popup />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import AppLogo from '@/components/AppLogo.vue';
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
  .map((l) => ({ label: l.name, value: l.code, style: { fontFamily: l.font.family } }));
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
.home-col {
  max-width: 480px;
}

// The switcher is always left-to-right, so its end buttons keep their own rounded sides.
.lang-toggle {
  border: 1px solid var(--q-primary);
  border-radius: 28px;
}

.lang-toggle :deep(.q-btn) {
  line-height: 1;
  padding-top: 8px;
  padding-bottom: 8px;
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

.home-card {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  overflow: hidden;

  :deep(.q-item) {
    min-height: 60px;
  }

  :deep(.q-separator) {
    background: rgba(128, 128, 128, 0.2);
  }
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--q-primary);
}
</style>
