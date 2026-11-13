<template>
  <q-page class="q-pa-md setup-page">
    <div class="row items-center q-mb-sm">
      <q-btn flat round icon="close" :aria-label="t('setup.exit')" to="/" />
      <div class="text-h5 text-weight-bold q-mx-sm">{{ t('setup.title') }}</div>
    </div>

    <q-dialog v-model="leave.open.value">
      <q-card flat class="dialog-card">
        <div class="dialog-head">
          <div class="dialog-icon"><q-icon name="logout" size="22px" /></div>
          <div class="text-h6 text-weight-bold">{{ t('setup.discardTitle') }}</div>
        </div>
        <p class="q-mb-none">{{ t('setup.discardBody') }}</p>
        <div class="dialog-actions">
          <q-btn v-close-popup outline rounded no-caps color="primary" :label="t('setup.keepEditing')" />
          <q-btn rounded no-caps color="primary" :label="t('setup.discard')" @click="discard" />
        </div>
      </q-card>
    </q-dialog>

    <q-stepper v-model="step" flat animated alternative-labels class="setup-stepper">
      <q-step name="mode" :title="t('setup.steps.mode')" icon="tune" :done="stepIndex > 0">
        <div class="text-subtitle2 text-grey-7 q-mb-xs">{{ t('setup.teamsTitle') }}</div>
        <div class="team-row">
          <div class="team-circles">
            <button
              v-for="(color, i) in setup.teamColors"
              :key="i"
              type="button"
              class="team-circle"
              :style="{ background: teamHex(color) }"
              :aria-label="`${t(`teamColors.${color}`)}: ${t('setup.pickColor')}`"
              @click="colorTeam = i"
            />
          </div>
          <q-btn
            round
            outline
            color="primary"
            icon="add"
            :aria-label="t('setup.addTeam')"
            :disable="setup.teamCount >= MAX_TEAMS"
            @click="setup.addTeam()"
          />
        </div>

        <div class="row q-col-gutter-sm">
          <div v-for="m in modes" :key="m.value" class="col-12 col-sm-6">
            <q-card
              flat
              class="mode-card cursor-pointer"
              :class="{ selected: setup.mode === m.value }"
              role="radio"
              :aria-checked="setup.mode === m.value"
              tabindex="0"
              @click="setup.mode = m.value"
              @keydown.enter.space.prevent="setup.mode = m.value"
            >
              <q-card-section>
                <div class="row items-center no-wrap">
                  <div class="text-subtitle1 text-weight-medium col">{{ t(m.title) }}</div>
                  <q-icon
                    v-if="setup.mode === m.value"
                    name="check_circle"
                    size="sm"
                    color="primary"
                  />
                </div>
                <div class="mode-desc">{{ t(m.desc) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="q-mt-md">
          <q-btn
            outline
            no-caps
            rounded
            color="primary"
            icon="settings"
            :label="t('setup.gameSettings')"
            @click="openSettings"
          />
          <div class="text-grey-7 q-mt-sm">{{ summary }}</div>
        </div>

        <q-dialog :model-value="colorTeam !== null" @update:model-value="colorTeam = null">
          <q-card flat class="dialog-card">
            <div class="text-h6 text-weight-bold q-mb-md">{{ t('setup.pickColor') }}</div>
            <div v-if="colorTeam !== null" class="swatches" role="radiogroup">
              <button
                v-for="c in TEAM_COLORS"
                :key="c.id"
                type="button"
                class="swatch"
                :class="{ selected: c.id === setup.teamColors[colorTeam] }"
                :style="{ background: c.hex }"
                role="radio"
                :aria-checked="c.id === setup.teamColors[colorTeam]"
                :aria-label="t(`teamColors.${c.id}`)"
                :disabled="c.id !== setup.teamColors[colorTeam] && setup.teamColors.includes(c.id)"
                @click="pickColor(c.id)"
              >
                <q-icon v-if="c.id === setup.teamColors[colorTeam]" name="check" color="white" size="20px" />
              </button>
            </div>
            <div class="dialog-actions">
              <q-btn
                outline
                rounded
                no-caps
                color="primary"
                icon="delete_outline"
                :label="t('setup.removeTeam')"
                :disable="setup.teamCount <= MIN_TEAMS"
                @click="removeColorTeam"
              />
              <q-btn v-close-popup rounded no-caps color="primary" :label="t('home.ok')" />
            </div>
          </q-card>
        </q-dialog>

        <q-dialog
          v-model="settingsOpen"
          maximized
          transition-show="slide-up"
          transition-hide="slide-down"
        >
          <q-card class="column no-wrap">
            <q-toolbar class="settings-bar">
              <q-toolbar-title class="text-weight-bold">{{
                t('setup.gameSettings')
              }}</q-toolbar-title>
              <q-btn
                outline
                rounded
                no-caps
                dense
                color="primary"
                :label="t('setup.resetDefaults')"
                @click="setup.resetSettings()"
              />
            </q-toolbar>
            <q-separator />
            <q-card-section class="col scroll">
              <div class="settings-col">
                <div class="settings-heading text-primary text-weight-bold">
                  {{ t('setup.sectionScoring') }}
                </div>
                <q-list class="settings-list">
                  <q-item v-for="d in DIFFICULTIES" :key="d">
                    <q-item-section>{{ t(`setup.points${d}`) }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper v-model="setup.settings.points[d]" :min="1" :max="20" />
                    </q-item-section>
                  </q-item>
                </q-list>
                <div class="settings-heading text-primary text-weight-bold q-mt-md">
                  {{ t('setup.sectionRules') }}
                </div>
                <q-list v-if="setup.mode === 'multi'" class="settings-list">
                  <q-item>
                    <q-item-section>{{ t('setup.turnSeconds') }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper
                        v-model="setup.settings.multi.turnSeconds"
                        :min="15"
                        :max="300"
                        :step="15"
                      />
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>{{ t('setup.unlimitedSkips') }}</q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="skipUnlimited" />
                    </q-item-section>
                  </q-item>
                  <q-item v-if="setup.settings.multi.skipLimit !== null">
                    <q-item-section>{{ t('setup.skipLimit') }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper v-model="skipLimitValue" :min="0" :max="20" />
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>{{ t('setup.skipPenalty') }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper v-model="setup.settings.multi.skipPenalty" :max="10" />
                    </q-item-section>
                  </q-item>
                  <q-item tag="label">
                    <q-item-section>{{ t('setup.lastSecondBonus') }}</q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="setup.settings.multi.lastSecondBonus" />
                    </q-item-section>
                  </q-item>
                </q-list>

                <q-list v-else class="settings-list">
                  <q-item v-for="d in DIFFICULTIES" :key="d">
                    <q-item-section>{{ t(`setup.timer${d}`) }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper
                        v-model="setup.settings.single.timerSeconds[d]"
                        :min="10"
                        :max="300"
                        :step="5"
                      />
                    </q-item-section>
                  </q-item>
                  <q-item tag="label">
                    <q-item-section>
                      <q-item-label>{{ t('setup.steal') }}</q-item-label>
                      <q-item-label v-if="!stealAllowed" caption>{{
                        t('setup.stealTwoOnly')
                      }}</q-item-label>
                    </q-item-section>
                    <q-item-section side
                      ><q-toggle
                        :model-value="stealAllowed && setup.settings.single.steal"
                        :disable="!stealAllowed"
                        @update:model-value="setup.settings.single.steal = $event"
                    /></q-item-section>
                  </q-item>
                  <q-item v-if="stealAllowed && setup.settings.single.steal">
                    <q-item-section>
                      <q-item-label>{{ t('setup.stealValue') }}</q-item-label>
                      <q-option-group
                        v-model="stealValueMode"
                        type="radio"
                        color="primary"
                        :options="stealValueOptions"
                      />
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>{{ t('setup.rerollPenalty') }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper v-model="setup.settings.single.rerollPenalty" :max="10" />
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>{{ t('setup.fastSeconds') }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper
                        v-model="setup.settings.single.fastGuessSeconds"
                        :min="1"
                        :max="60"
                      />
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>{{ t('setup.fastBonus') }}</q-item-section>
                    <q-item-section side>
                      <NumberStepper v-model="setup.settings.single.fastGuessBonus" :max="10" />
                    </q-item-section>
                  </q-item>
                </q-list>

                <div class="settings-heading text-primary text-weight-bold q-mt-md">
                  {{ t('setup.sectionGold') }}
                </div>
                <q-list class="settings-list">
                  <q-item tag="label">
                    <q-item-section>{{ t('setup.goldEnabled') }}</q-item-section>
                    <q-item-section side
                      ><q-toggle v-model="setup.settings.gold.enabled"
                    /></q-item-section>
                  </q-item>
                  <template v-if="setup.settings.gold.enabled">
                    <q-item>
                      <q-item-section>{{ t('setup.goldBonus') }}</q-item-section>
                      <q-item-section side>
                        <NumberStepper v-model="setup.settings.gold.bonus" :max="100" :step="5" />
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>{{ t('setup.goldPenalty') }}</q-item-section>
                      <q-item-section side>
                        <NumberStepper v-model="setup.settings.gold.penalty" :max="100" :step="5" />
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>{{ t('setup.goldTimer') }}</q-item-section>
                      <q-item-section side>
                        <NumberStepper
                          v-model="setup.settings.gold.timerSeconds"
                          :min="10"
                          :max="300"
                          :step="5"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                </q-list>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions class="settings-actions q-pa-md no-wrap" style="gap: 16px">
              <q-btn
                class="col"
                outline
                color="primary"
                rounded
                no-caps
                :label="t('setup.cancel')"
                @click="cancelSettings"
              />
              <q-btn
                class="col"
                color="primary"
                rounded
                no-caps
                :label="t('setup.done')"
                @click="confirmSettings"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </q-step>

      <q-step
        name="categories"
        :title="t('setup.steps.categories')"
        icon="category"
      >
        <div class="q-mb-md">
          <div class="q-mb-xs" :class="{ 'text-primary text-weight-bold': !enoughCategories }">
            {{
              t('setup.categoriesHint', {
                min: fmt(setup.minCategories),
                n: fmt(setup.categoryIds.length),
              })
            }}
          </div>
          <div v-if="enoughCategories" class="text-grey-7">
            {{ t('setup.tiles', { n: fmt(setup.tileCount) }) }}
          </div>
          <div v-if="enoughCategories && setup.trimmedCount > 0" class="text-grey-7">
            {{ t('setup.trimmed', { n: fmt(setup.trimmedCount) }, setup.trimmedCount) }}
          </div>
        </div>
        <div class="row justify-center q-mb-md">
          <q-btn
            class="select-all-btn no-wrap"
            outline
            rounded
            no-caps
            color="primary"
            :icon="allSelected ? 'deselect' : 'select_all'"
            :label="allSelected ? t('setup.clearAll') : t('setup.selectAll')"
            @click="toggleAll"
          />
        </div>
        <div class="row q-col-gutter-sm">
          <div v-for="c in categories" :key="c.id" class="col-6 col-sm-4">
            <q-card
              flat
              class="cursor-pointer text-center q-pa-md category-card"
              :class="{ selected: setup.categoryIds.includes(c.id) }"
              role="checkbox"
              :aria-checked="setup.categoryIds.includes(c.id)"
              tabindex="0"
              @click="setup.toggleCategory(c.id)"
              @keydown.enter.space.prevent="setup.toggleCategory(c.id)"
            >
              <q-icon
                v-if="setup.categoryIds.includes(c.id)"
                name="check_circle"
                class="check"
                size="sm"
              />
              <div class="text-subtitle1 text-weight-bold">{{ c.name }}</div>
              <div class="cat-meta text-caption">
                <span v-if="c.custom" class="custom-tag">
                  <q-icon name="edit_note" size="14px" />{{ t('setup.customTag') }}
                </span>
                <span>{{ t('setup.wordCount', { n: fmt(c.words) }, c.words) }}</span>
              </div>
            </q-card>
          </div>
        </div>
      </q-step>
    </q-stepper>

    <div class="setup-nav action-bar row justify-between items-center">
      <q-btn
        v-if="stepIndex > 0"
        outline
        rounded
        no-caps
        color="primary"
        :label="t('setup.back')"
        @click="step = steps[stepIndex - 1]!"
      />
      <span v-else />
      <q-btn
        v-if="stepIndex < steps.length - 1"
        color="primary"
        rounded
        no-caps
        :label="t('setup.next')"
        :disable="!canAdvance"
        @click="step = steps[stepIndex + 1]!"
      />
      <q-btn v-else color="primary" rounded no-caps :label="t('setup.start')" @click="start" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import NumberStepper from '@/components/NumberStepper.vue';
import { useLeaveGuard } from '@/composables/leaveGuard';
import { TEAM_COLORS, teamHex } from '@/config/teamColors';
import { MAX_TEAMS, MIN_TEAMS } from '@/game/board';
import { canSteal } from '@/game/scoring';
import { DIFFICULTIES, type Settings } from '@/game/types';
import { categoryWordCount, listCategories } from '@/services/packs';
import { formatNumber } from '@/services/format';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { useSetupStore } from '@/stores/setup';

const steps = ['mode', 'categories'] as const;
type Step = (typeof steps)[number];

const { t } = useI18n();
const router = useRouter();
const settings = useSettingsStore();
const setup = useSetupStore();
const game = useGameStore();

const step = ref<Step>('mode');
/** Index of the team whose color dialog is open. */
const colorTeam = ref<number | null>(null);
function pickColor(id: string) {
  if (colorTeam.value === null) return;
  setup.setColor(colorTeam.value, id);
  colorTeam.value = null;
}
function removeColorTeam() {
  if (colorTeam.value === null) return;
  setup.removeTeam(colorTeam.value);
  colorTeam.value = null;
}
const settingsOpen = ref(false);
// Settings as they were when the dialog opened; Cancel (or Esc) restores them.
let settingsBackup: Settings | null = null;
let settingsConfirmed = false;
function openSettings() {
  settingsBackup = structuredClone(toRaw(setup.settings));
  settingsConfirmed = false;
  settingsOpen.value = true;
}
function confirmSettings() {
  settingsConfirmed = true;
  settingsOpen.value = false;
}
function cancelSettings() {
  settingsOpen.value = false;
}
watch(settingsOpen, (open) => {
  if (!open && settingsBackup && !settingsConfirmed) setup.settings = settingsBackup;
  if (!open) settingsBackup = null;
});
const modes = [
  { value: 'single', title: 'setup.modeSingle', desc: 'setup.modeSingleDesc' },
  { value: 'multi', title: 'setup.modeMulti', desc: 'setup.modeMultiDesc' },
] as const;
const stealAllowed = computed(() => canSteal(setup.teamCount));
const stealValueOptions = computed(() => [
  { label: t('setup.stealFull'), value: 'full' },
  { label: t('setup.stealHalfOption'), value: 'half' },
]);
const stealValueMode = computed({
  get: () => (setup.settings.single.stealHalf ? 'half' : 'full'),
  set: (v: string) => (setup.settings.single.stealHalf = v === 'half'),
});
const stepIndex = computed(() => steps.indexOf(step.value));
const categories = computed(() =>
  listCategories(settings.language).map((c) => ({
    ...c,
    words: categoryWordCount(settings.language, c.id),
  })),
);

const fmt = (n: number) => formatNumber(n, settings.language);
const allSelected = computed(
  () => categories.value.length > 0 && setup.categoryIds.length === categories.value.length,
);
function toggleAll() {
  setup.categoryIds = allSelected.value ? [] : categories.value.map((c) => c.id);
}
const enoughCategories = computed(() => setup.categoryIds.length >= setup.minCategories);

const summary = computed(() => {
  const g = setup.settings;
  const parts: string[] = [];
  if (setup.mode === 'multi') {
    parts.push(t('setup.sumTurn', { n: fmt(g.multi.turnSeconds) }));
    parts.push(
      g.multi.skipLimit === null
        ? t('setup.sumSkipsUnlimited')
        : t('setup.sumSkips', { n: fmt(g.multi.skipLimit) }),
    );
  } else {
    const [a, b, c] = DIFFICULTIES.map((d) => fmt(g.single.timerSeconds[d]));
    parts.push(t('setup.sumTimers', { a, b, c }));
    parts.push(g.single.steal && stealAllowed.value ? t('setup.sumSteal') : t('setup.sumNoSteal'));
  }
  parts.push(g.gold.enabled ? t('setup.sumGoldOn') : t('setup.sumGoldOff'));
  return parts.join(' - ');
});

const canAdvance = computed(() => {
  if (step.value === 'categories') return enoughCategories.value;
  return true;
});

// Skip limit: null means unlimited. Remember the last number while the switch is on.
const DEFAULT_SKIP = 3;
const lastSkipLimit = ref(setup.settings.multi.skipLimit ?? DEFAULT_SKIP);
const skipUnlimited = computed({
  get: () => setup.settings.multi.skipLimit === null,
  set: (v: boolean) => {
    setup.settings.multi.skipLimit = v ? null : lastSkipLimit.value;
  },
});
const skipLimitValue = computed({
  get: () => setup.settings.multi.skipLimit ?? lastSkipLimit.value,
  set: (v: number) => {
    lastSkipLimit.value = v;
    setup.settings.multi.skipLimit = v;
  },
});

/** Teams and categories as the page first shows them. */
const choices = () => JSON.stringify([setup.teamColors, [...setup.categoryIds].sort()]);
let initialChoices = '';
// Leaving with changed teams or categories asks first (the X button and the browser's back).
const leave = useLeaveGuard(() => initialChoices !== '' && choices() !== initialChoices);
function discard() {
  leave.allow();
  void router.push('/');
}

onMounted(() => {
  // Teams, categories, mode and settings start as the last game had them.
  setup.syncCategories(categories.value.map((c) => c.id));
  initialChoices = choices();
});

// Selected categories must exist in the current language's pack.
watch(categories, (list) => {
  const ids = new Set(list.map((c) => c.id));
  setup.categoryIds = setup.categoryIds.filter((id) => ids.has(id));
});

function start() {
  game.start({
    teamColors: [...setup.teamColors],
    categoryIds: [...setup.categoryIds],
    mode: setup.mode,
    settings: JSON.parse(JSON.stringify(setup.settings)) as Settings,
    lang: settings.language,
  });
  leave.allow();
  void router.push('/board');
}
</script>

<style scoped lang="scss">
.setup-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}

// Back and Next stay pinned to the bottom of the screen (shared .action-bar), whatever the page length.
.setup-nav {
  width: 100%;
  max-width: 560px;
  // Pushes the bar to the bottom when the page is shorter than the screen.
  margin: auto auto 0;
}

.setup-stepper {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  background: transparent;
}

// Keep the three step labels on one line on narrow phones.
:deep(.q-stepper__header) {
  flex-wrap: nowrap;
  border: 0;
}

:deep(.q-stepper__tab) {
  flex: 1 1 0;
  min-width: 0;
  padding-inline: 4px;
}

:deep(.q-stepper__tab .q-stepper__title) {
  font-size: 0.8rem;
  font-weight: 600;
}

:deep(.q-stepper__line) {
  min-width: 0;
}

:deep(.q-stepper__step-inner) {
  padding-inline: 0;
  padding-top: 8px;
}

.team-row {
  margin-bottom: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.team-circles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.team-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  padding: 0;
}

.swatches {
  display: grid;
  grid-template-columns: repeat(4, 40px);
  justify-content: space-evenly;
  gap: 8px;
}

.swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &.selected {
    border-color: var(--q-dark, #000);
    box-shadow: 0 0 0 2px #fff inset;
  }

  &:disabled {
    opacity: 0.2;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.mode-card {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  border: 2px solid transparent;
  height: 100%;

  &.selected {
    border-color: var(--q-primary);
    background: rgba(128, 128, 128, 0.16);
  }

  .mode-desc {
    opacity: 0.75;
  }
}

.category-card {
  position: relative;
  height: 100%;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  border: 2px solid transparent;

  .cat-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px 8px;
    opacity: 0.75;
  }

  .custom-tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px;
    border-radius: 999px;
    border: 1px solid currentColor;
    font-weight: 600;
  }

  &.selected {
    border-color: var(--q-primary);
    background: var(--q-primary);
    color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .check {
    position: absolute;
    top: 4px;
    inset-inline-end: 4px;
  }
}

.settings-bar {
  gap: 12px;
}

.dialog-icon-round {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--q-primary);
}

.settings-col,
.settings-actions {
  max-width: 560px;
  margin-inline: auto;
  width: 100%;
}

.settings-heading {
  margin: 8px 4px;
}

.settings-list {
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.1);
  overflow: hidden;

  .q-item + .q-item {
    border-top: 1px solid rgba(128, 128, 128, 0.2);
  }
}
.select-all-btn {
  width: 220px;
}
</style>
