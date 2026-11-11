// https://github.com/michael-ciniawsky/postcss-load-config

import autoprefixer from 'autoprefixer';
import rtlcss from 'postcss-rtlcss';
import { Mode } from 'postcss-rtlcss/options';

export default {
  plugins: [
    // https://github.com/postcss/autoprefixer
    autoprefixer({
      overrideBrowserslist: ['baseline widely available'],
    }),

    // https://github.com/elchininet/postcss-rtlcss
    // If you want to support RTL css, then
    // 1. yarn/pnpm/bun/npm install postcss-rtlcss
    // 2. optionally set quasar.config.js > framework > lang to an RTL language
    // 3. uncomment the following line (and its import statement above):
    // Combined mode emits [dir=ltr] and [dir=rtl] variants of direction-dependent rules, so one build serves both directions
    // and the language can be switched at runtime.
    rtlcss({ mode: Mode.combined }),
  ],
};
