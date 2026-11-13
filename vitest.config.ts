import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify('0.0.0-test') },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // Component tests run in a browser-like DOM, so they need Quasar's client build.
      { find: /^quasar$/, replacement: 'quasar/dist/quasar.client.js' },
    ],
  },
  test: { include: ['tests/**/*.test.ts'] },
});
