<template>
  <!-- Same artwork as assets-src/icon.svg, but the background follows the theme color. -->
  <svg class="app-logo" viewBox="0 0 512 512" aria-hidden="true">
    <defs>
      <path
        id="logo-mask"
        d="M0-90C60-90 92-62 92-12C92 52 52 98 0 98C-52 98-92 52-92-12C-92-62-60-90 0-90Z"
      />
    </defs>
    <rect width="512" height="512" rx="112" class="bg" />
    <g transform="translate(322 282) rotate(14) scale(1.12)">
      <use href="#logo-mask" fill="#ffe0b2" />
      <path
        d="M-62-18Q-40-40-18-18Q-40-28-62-18ZM62-18Q40-40 18-18Q40-28 62-18Z"
        class="face"
        stroke-width="10"
        stroke-linejoin="round"
      />
      <path
        d="M-34 58Q0 28 34 58"
        fill="none"
        class="line"
        stroke-width="12"
        stroke-linecap="round"
      />
    </g>
    <g transform="translate(190 236) rotate(-14) scale(1.12)">
      <use href="#logo-mask" fill="#fff" class="edge" stroke-width="14" />
      <path
        d="M-62-20Q-40 4-18-20Q-40-8-62-20ZM62-20Q40 4 18-20Q40-8 62-20Z"
        class="face"
        stroke-width="10"
        stroke-linejoin="round"
      />
      <path
        d="M-44 28Q0 80 44 28"
        fill="none"
        class="line"
        stroke-width="12"
        stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<style scoped lang="scss">
.app-logo {
  width: 96px;
  height: 96px;
}
.bg {
  fill: var(--q-primary);
}
.face {
  fill: var(--q-primary);
  stroke: var(--q-primary);
}
.line,
.edge {
  stroke: var(--q-primary);
}
</style>
