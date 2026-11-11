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

    <q-list bordered separator class="rounded-borders">
      <q-expansion-item
        v-for="(id, i) in sectionIds"
        :key="id"
        :label="t(`help.sections.${id}.title`)"
        group="help"
        :default-opened="i === 0"
        header-class="text-weight-medium"
      >
        <q-card flat>
          <q-card-section v-for="(item, j) in items(id)" :key="j" class="q-py-sm">
            <div v-if="item.g" class="text-subtitle1 text-primary text-weight-bold q-pt-sm">
              {{ i18n.rt(item.g, values) }}
            </div>
            <template v-else>
              <div class="text-weight-bold">{{ i18n.rt(item.t ?? '', values) }}</div>
              <div>{{ i18n.rt(item.b ?? '', values) }}</div>
            </template>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>
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

<style scoped>
.help-page {
  max-width: 40rem;
  margin-inline: auto;
}
</style>
