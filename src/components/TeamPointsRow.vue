<template>
  <div class="line-row q--avoid-card-border row items-center no-wrap justify-between" :style="{ '--team': color }">
    <div class="team-pill text-subtitle1 text-weight-bold" :style="{ background: color }">
      {{ name }}
    </div>
    <div class="line-points text-h5 text-weight-bold">{{ points }}</div>
  </div>
</template>

<script setup lang="ts">
/** One team's points on a result screen: its color-marked pill and the signed points. */
defineProps<{
  name: string;
  /** The team's color as a CSS color. */
  color: string;
  /** The points, already formatted. */
  points: string;
}>();
</script>

<style scoped lang="scss">
.team-pill {
  display: inline-block;
  color: #fff;
  padding: 2px 16px;
  border-radius: 16px;
}

.line-row {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.08);
  border-inline-start: 6px solid var(--team);
}

.line-points {
  line-height: 1.2;
}
</style>
