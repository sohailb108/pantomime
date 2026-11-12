<template>
  <q-page class="q-pa-md help-page">
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        round
        icon="arrow_back"
        class="flip-rtl"
        :aria-label="t('help.back')"
        @click="goBack"
      />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('help.title') }}</div>
    </div>

    <div class="help-list">
      <q-expansion-item
        v-for="(id, i) in sectionIds"
        :key="id"
        :label="t(`help.sections.${id}.title`)"
        group="help"
        :default-opened="i === 0"
        class="help-card"
        header-class="help-header text-weight-bold"
      >
        <template #header>
          <q-item-section avatar>
            <div class="help-avatar"><q-icon :name="ICONS[id]" color="white" size="22px" /></div>
          </q-item-section>
          <q-item-section class="text-weight-bold text-subtitle1">
            {{ t(`help.sections.${id}.title`) }}
          </q-item-section>
        </template>
        <div class="help-body">
          <template v-for="(item, j) in items(id)" :key="j">
            <div v-if="item.g" class="help-group text-primary text-weight-bold">
              {{ i18n.rt(item.g, values) }}
            </div>
            <div v-else class="help-item">
              <div class="text-weight-bold">{{ i18n.rt(item.t ?? '', values) }}</div>
              <div class="help-text">{{ i18n.rt(item.b ?? '', values) }}</div>
            </div>
          </template>
        </div>
      </q-expansion-item>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { helpValues } from '@/i18n/help';
import { useSettingsStore } from '@/stores/settings';

/** A help entry: a title with a body, or (g) a group heading. */
interface HelpItem {
  t?: string;
  b?: string;
  g?: string;
}

const sectionIds = [
  'quickStart',
  'rules',
  'settings',
  'tips',
  'customWords',
  'data',
  'install',
  'faq',
  'about',
] as const;

const ICONS: Record<(typeof sectionIds)[number], string> = {
  quickStart: 'rocket_launch',
  rules: 'rule',
  settings: 'tune',
  tips: 'lightbulb',
  customWords: 'edit_note',
  data: 'lock',
  install: 'install_mobile',
  faq: 'help_outline',
  about: 'info',
};

const i18n = useI18n();
const { t } = i18n;
const router = useRouter();
const settings = useSettingsStore();

const values = computed(() => ({
  ...helpValues(settings.language),
  version: __APP_VERSION__,
}));

const items = (id: string): HelpItem[] => {
  const raw: unknown = i18n.tm(`help.sections.${id}.items`);
  return raw as HelpItem[];
};

function goBack() {
  if (window.history.length > 1) router.back();
  else void router.push('/');
}
</script>

<style scoped lang="scss">
.help-page {
  max-width: 40rem;
  margin-inline: auto;
}
.help-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.help-card {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  overflow: hidden;
}
.help-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--q-primary);
}
.help-body {
  padding: 4px 16px 16px;
}
.help-item {
  padding: 10px 0;
  & + .help-item {
    border-top: 1px solid rgba(128, 128, 128, 0.2);
  }
}
.help-text {
  margin-top: 2px;
  opacity: 0.85;
  line-height: 1.6;
}
.help-group {
  margin-top: 12px;
  padding: 4px 10px;
  border-inline-start: 4px solid var(--q-primary);
  background: rgba(128, 128, 128, 0.12);
  border-radius: 4px 8px 8px 4px;
}
</style>
