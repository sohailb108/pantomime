# Pantomime

A free, offline-first Pantomime (charades) party game, built as a PWA with Quasar, Vue 3 and TypeScript.
See [DESIGN.md](DESIGN.md) for the full design.

## License

Free to use, change and share for noncommercial purposes under the
[PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use, including selling the game or
adding ads or paid features, is not permitted without the owner's permission. The game currently has no
accounts or tracking.

## Commands

```bash
npm install
npx quasar dev -m pwa        # dev server
npm run typecheck            # vue-tsc
npm test                     # vitest (game logic)
npm run lint                 # eslint
npx quasar build -m pwa      # production build -> dist/pwa
```

## Deploying in a subfolder

The build uses relative asset paths by default (`./`), so `dist/pwa` can be copied into any folder
of a static host. To pin an absolute subfolder path instead:

```bash
PUBLIC_PATH=/games/pantomime/ npx quasar build -m pwa
```

The router uses hash mode, so no server rewrite rules are needed.

## GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which type-checks, tests, builds and publishes
`dist/pwa`. One-time setup: in the repo, Settings, Pages, set Source to GitHub Actions. The app is then
at `https://<user>.github.io/<repo>/`. To move to your own host, copy the same `dist/pwa` folder to
`/games/pantomime/`. Browser data (installs, saved games, custom words) does not move between addresses.

## Adding a language

1. Add `src/i18n/<code>/index.ts` and register it in `src/i18n/index.ts`.
2. Add an entry (direction, font, numerals, Quasar pack) to `src/i18n/languages.ts`.
3. Add word packs under `src/packs/<code>/`.

The app name lives in `src/config/app.ts`.
