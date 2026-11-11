# Pantomime PWA: Design Document

Status: draft for review. Date: 2026-11-10.

## 1. Goals

- A free, offline-first Pantomime (charades) party game, installable as a PWA (no app stores).
- First language: Persian (RTL, Vazirmatn font, Persian digits, Persian-culture content).
- Easy to add other languages: a locale file plus a word-pack folder, no code changes.
- License: PolyForm Noncommercial 1.0.0 (`LICENSE`), so others cannot use the game commercially; the owner keeps all rights, including to change the license. The owner may add ads in future, so the app makes no promise about ads or monetization (the Help About text only says it is free, with no tracking and no accounts; change it if that stops being true).
- No backend. Static files only. Host-agnostic and deployable in a **subfolder**.
- Stack: Quasar (Vue 3), TypeScript, Pinia, vue-i18n.

Non-goals (v1): online multiplayer, accounts, leaderboards, monetization, AI-generated words.

## 2. Game Rules

### 2.1 Setup

1. Pick 2 to 6 teams. A team is identified by a **color** chosen from a fixed palette (no free-text names); each team needs a different color.
2. Choose categories. The minimum is `ceil(teams / 3)` (for example 2 teams need 1 category, 4 teams need 2, 6 teams need 2), so every team gets at least one tile. The Start button stays disabled with a hint until the minimum is met.
3. Choose the mode (multi-word or single-word) and adjust its settings.

### 2.2 Board

- Every chosen category has 3 difficulty levels (1 easy, 2 medium, 3 hard).
- Board tiles = categories x 3 (for example 3 categories give 9 tiles).
- **Gold round:** an optional final round for non-leading teams, see section 2.6. It is not part of the tile count or trimming below.
- **Trimming:** if tile count is not a multiple of the team count, remove random **difficulty-1** tiles until it is (for 2 teams and 9 tiles, one easy tile is removed, leaving 8). This keeps turns equal for all teams.
  - If there are not enough easy tiles to remove, fall back to removing random tiles of the lowest difficulty remaining.
- Teams alternate turns. On its turn a team picks any remaining tile. A played tile is used up.
- When all tiles are played, the optional gold round (section 2.6) runs, then the game ends. The highest score wins (ties allowed).

### 2.3 Turn start (handoff)

Before every turn a **"Pass to actor"** screen shows the team, the chosen tile and a large button. The word is never visible until the actor taps it.

### Tile points (confirmed)

- A tile's points depend on its difficulty and are **configurable in setup** (Mode step, for both modes): easy, medium and hard, default **2 / 4 / 6**, each between 1 and 20. They are stored in `Settings.points`. Scoring uses the tile's points everywhere the difficulty number was used before (correct words, single-word success, a correct steal); difficulty still selects the word pool and the single-word timer.

### 2.4 Multi-word mode (timed)

- Word hidden until the actor taps reveal, then the timer starts.
- Buttons: **Correct** and **Skip**. Words are drawn from the tile's pool with no repeats.
- Each correct word scores the tile's points (see "Tile points" below).
- Settings:
  - Turn duration (for example 30, 60, 90, 120 s).
  - Skip limit (a number, or unlimited).
  - Skip penalty (points lost per skip; 0 means free).
  - "Finish the current word after time ends" (setting `lastSecondBonus`; the guide uses the same wording as the setting label): when on and the timer ends, the actor may still finish the current word.

### 2.5 Single-word mode

- One word per turn. Points on success = the tile's points (see "Tile points" below).
- Flow: the word is shown on the pass screen. The actor taps **Start**, the timer starts and the word is **covered**. Holding on the word uncovers it temporarily (the judge, who holds the phone, can check guesses).
- The judge taps **Guessed**, or **Give up** (which asks for a confirm tap first), or the timer runs out. Giving up and a timeout both count as a failed turn, and a failed turn triggers the steal chance if enabled.
- Settings:
  - Timer per difficulty (for example 30/60/90 s).
  - Steal chance: after a failure, the opposing team gets one guess for the points. The judge resolves it with Correct or Wrong. With more than 2 teams, the next team in order gets the steal.
  - Reroll word: one swap per turn, allowed only before Start. Costs a configurable penalty (default 1 point, 0 means free) deducted from the team's score.
  - Fast-guess bonus: configurable threshold (seconds) and bonus points. A correct guess within the threshold adds the bonus points.

### 2.6 Gold round (optional, end of game)

A final comeback chance for the teams that are not clearly leading (or are tied for the lead), with a big bonus.

- **Config:** can be enabled or disabled in the game setup (default: enabled). Configurable: **bonus amount** (default 20) and **failure penalty** (default 20 points, 0 means none).
- **When:** after all normal tiles are played. It is not a board tile and does not affect trimming (section 2.2) or the normal turn count.
- **Eligibility:** all teams except a single leader. Scores are snapshotted at the start of the gold round. If several teams tie for first, the tied teams are eligible too, so each gets a chance to break the tie. If all teams are tied, every team is eligible.
- **Optional for each team:** an eligible team may **decline** its attempt ("Keep my points") and keep its score unchanged, since a failure costs points. A declining team simply drops out of the queue and the next eligible team is offered the attempt. If every eligible team declines, the game ends with the scores as they are. The choice is made on the gold intro screen, before any word is shown.
- **Order:** each eligible team gets **one attempt** (or declines), starting from the lowest score and going upwards (ties broken randomly). Each attempt uses a different word.
- **Words:** drawn from the language's gold word pool (`src/packs/<lang>/gold.json`), made of very difficult words.
- **Play:** always single-word flow (Start, covered word with hold-to-peek, judge taps Guessed or Give up with a confirm tap), whichever mode the game uses. The timer is the difficulty-3 timer. No reroll and no steal.
- **Success:** the bonus is added to the team's score and the **gold round ends immediately**. Teams that have not attempted yet do not play. The final ranking is decided by the normal score order, so the highest score wins (the default bonus is meant to be large enough to usually win).
- **Failure:** the penalty is deducted from the team's score (scores may go below zero; the display allows negative numbers), and the next eligible team goes.
- **Ending:** if every eligible team fails or declines, the game ends with the scores after any penalties.
- The gold screen shows a clear "last chance" intro and a confirmation for each attempt.

### 2.4/2.5/2.6 Decisions (confirmed)

- Fast-guess bonus adds points, not time.
- In multi-word mode, tile pool exhaustion ends the turn early.
- One gold pool per language, no per-category variant.
- Ranking ties after the gold round are shown as ties.

## 3. Word Content

### 3.1 Pack format (JSON, one file per language and category)

```jsonc
// src/packs/fa/animals.json
{
  "schema": 1,
  "id": "animals",
  "lang": "fa",
  "version": 1,
  "name": "حیوانات",
  "words": {
    "1": ["گربه", "سگ"],
    "2": ["پنگوئن"],
    "3": ["آردوارک"],
  },
}
```

- Target size: about 40 to 60 words per difficulty (so 120 to 180 per category).
- An index file `src/packs/<lang>/index.json` lists the categories.
- Gold pool: `src/packs/<lang>/gold.json` (`{ "schema": 1, "lang": "fa", "words": [...] }`), a list of very hard words. About 50 words is a good start. Custom gold words can be added by users like other custom words.
- Words are drafted with AI assistance and **reviewed and edited by the owner**.

### 3.2 Custom words (milestone 7)

- Users can create **custom categories with 3 difficulties**, and also **add words to built-in categories** and to the gold pool. Built-in words cannot be edited, but they can be **hidden** (and shown again): hidden words are left out of every deck. Custom words are simply removed. The last word of a list cannot be hidden, so a pool never becomes empty.
- Custom data is **per language**: a custom category or word belongs to the language that was active when it was created, and shows up only when that language is selected.
- Stored in **localStorage** (`pantomime:custom`, versioned like the other saved data), not IndexedDB. Reason: games read word pools synchronously, the data is only short strings (a few hundred KB at the very most), and it avoids a new dependency. Moving to IndexedDB later only touches the custom store.
- Data shape per language: `categories` (id `c-<random>`, name, words per difficulty), `extra` (extra words for a built-in category id, per difficulty), `gold` (extra gold words), `hidden` (hidden built-in words by category id and difficulty) and `hiddenGold`. Saved data from before hiding existed is filled with empty values on load.
- Word rules: trimmed, whitespace collapsed, 1 to 40 characters, no duplicates inside the same list (case-insensitive). A word that also exists in the built-in list is allowed (decks drop duplicates).
- A custom category can be chosen in setup only when it has at least one word at every difficulty (otherwise a tile would have nothing to draw). The packs screen marks incomplete categories.
- **Built-in words are never listed** in the packs pages (players could memorize them); only the count and the hidden words are shown, and a hidden word can be shown again there. Words are hidden only from the turn result screen.
- On the turn **result screen** every word shown in the turn (in single-word mode that includes a word that was rerolled) is listed under "Words shown this turn" with its own Hide button next to the word, so it is always clear which word a button affects (with undo until leaving the screen). It hides a built-in word or removes a custom one, in the tile's category and difficulty.
- **Export and import** use JSON of the current language: `{ "schema": 1, "custom": true, "lang": "fa", "categories": [...], "extra": { "<categoryId>": { "1": [], "2": [], "3": [] } }, "gold": [...], "hidden": {...}, "hiddenGold": [...] }`. Import validates the structure and limits (word rules, at most 100 categories and 2000 words per list), then **merges** into the current data (new categories are added, words are added without duplicates). Nothing is overwritten or deleted by an import. A file for another language is rejected with a message.

### 3.3 Word history

- Used words are tracked per language, category and difficulty so they do not repeat across games. When every word of a pool has been used, the history of that pool resets and drawing starts over. (A visible notice is deferred to the polish milestone.)
- Stored in localStorage (a few strings per pool, read synchronously).

### 3.4 Remote pack updates (later, optional)

- A static `packs-manifest.json` plus pack files on any static host or CDN. The app checks for new versions when online and caches them. No server code is needed.

## 4. Persian and i18n

- vue-i18n, one locale file per language in `src/i18n/<lang>/`.
- **Per-language configuration:** each language declares its own direction and font in a language registry (`src/i18n/languages.ts`):
  ```ts
  interface LanguageConfig {
    code: string; // 'fa', 'en', ...
    name: string; // native name, e.g. 'فارسی'
    dir: 'rtl' | 'ltr'; // text direction
    font: {
      family: string; // CSS font-family stack, e.g. "'Vazirmatn', sans-serif"
      load?: () => Promise<unknown>; // loads self-hosted font files, e.g. () => import('@fontsource/vazirmatn/arabic-400.css')
    };
    quasarLang: () => Promise<{ default: QuasarLanguage }>; // Quasar component language pack
    numerals: string; // Intl numbering system, e.g. 'arabext' (Persian digits), 'latn'
    calendar?: string; // optional, for future use
  }
  ```
- On language switch the app sets `<html lang>` and `dir` from the config, and sets a `--app-font` CSS variable that all styles use. Fonts are loaded on demand per language (only the active language's `@font-face` is injected), and are precached by the service worker so they work offline.
- Use CSS logical properties (`margin-inline-start`, and so on) everywhere, never left or right. Direction-sensitive icons (arrows, chevrons) flip based on `dir`.
- Persian default: `dir: 'rtl'`, Vazirmatn (self-hosted), numerals `arabext` (Persian digits).
- Number formatting: a `formatNumber()` helper using `Intl.NumberFormat` with the language's `numerals` setting. Display only; internal values stay numeric.
- App name: a single constant in `src/config/app.ts` feeding the manifest, page title and i18n strings. Easily changeable.

Adding a language = add `src/i18n/<lang>/`, add `src/packs/<lang>/`, and add one entry (direction, font, numerals) to `languages.ts`.

## 5. UI/UX

- Style: playful and cheerful. Large rounded buttons, animated score changes.
- Dark mode (Quasar dark plugin) and four color themes (orange default, blue, green, purple) defined in `config/palettes.ts`. A theme sets Quasar's primary, secondary and accent brand colors at runtime (dark mode uses a lighter primary so theme-colored text and outlines stay readable, the same strength as orange) (`setCssVar`, applied in the i18n boot file). Round swatch buttons next to the toggles on Home choose it; the choice is saved as `palette` in `pantomime:settings`. Team colors are independent of the theme.
- Sound (timer ticks, end buzz, correct and skip cues) and vibration, both toggleable.
- Screen Wake Lock while the turn and gold pages are open (`useWakeLock`, feature-detected, requested again when the page becomes visible, fails silently). The timer is not paused when the screen sleeps, so locking the phone gives no extra time.
- Cues live in `services/feedback.ts`: synthesized with Web Audio (no audio files) plus `navigator.vibrate`. Tick in the last 5 seconds, end buzz, correct and skip cues. Sound and vibration are toggles on the Home page, both on by default, stored in `pantomime:settings`.
- Install button on Home (`services/install.ts`, started from the `install` boot file because `beforeinstallprompt` fires early): shown when the browser offers the install prompt (Chromium), and on iPhone and iPad Safari tabs, where it opens a dialog explaining Share, then Add to Home Screen. Hidden once the app is installed or running standalone.
- Share button on Home (`services/share.ts`): Web Share API with the app link (without the hash route); where unavailable it copies the link and shows a notification.

### 5.1 Screens

| Screen            | Purpose                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Home              | New game, Resume game, Word packs, Settings, Install                                                                              |
| Setup: Teams      | 2 to 6 teams, each with a color from the palette                                                                                  |
| Setup: Categories | Pick categories, preview the board                                                                                                |
| Setup: Mode       | Mode cards, a settings summary and a settings dialog (scoring, mode rules, gold round)                                            |
| Board             | Tiles by category x difficulty, scores, whose turn                                                                                |
| Pass to actor     | Handoff screen                                                                                                                    |
| Turn (multi)      | Hidden word, reveal, timer, Correct/Skip                                                                                          |
| Turn (single)     | Start, covered word with hold-to-peek, timer, Guessed/Give up (with confirm)                                                      |
| Steal             | Opposing team's single guess                                                                                                      |
| Gold round        | Last-chance intro, one attempt per eligible team, result                                                                          |
| Turn result       | Points gained and updated score                                                                                                   |
| Final results     | Ranking, play again                                                                                                               |
| Word packs        | `/packs`: categories, custom categories, gold words, import and export. `/packs/:id`: custom words of one category per difficulty |
| Settings          | Language, theme, sound, vibration                                                                                                 |
| Help              | Quick start, rules, settings guide, tips, custom words, data, install, FAQ, about                                                 |

### 5.2 Help page

A `/help` route (hash router), reachable from Home and from the in-game menu. One collapsible section per topic, all static text so it works offline.

Sections, in order:

1. **Quick start**: 3 to 4 steps for a first-time group.
2. **Rules and how to play**: setup, board and trimming, multi-word turn, single-word turn (hold to peek, steal, reroll), scoring, gold round.
3. **Settings guide**: every game option as its own entry with a short description and its default value, grouped under headings (Scoring, Multi-word mode, Single-word mode, Gold round, App settings). Entry titles use the exact labels of the settings (paired settings share one entry, for example "Timer, easy / medium / hard"). Group headings are items with only a `g` field.
4. **Tips for acting**: no talking, no pointing at objects, how to signal "sounds like", and similar.
5. **Custom words**: add, edit and delete your own words and how they mix into the pools.
6. **Saved games and data**: auto-save and resume, data stays on the device, clearing browser data erases it.
7. **Install and offline use**: add to the home screen on Android and iOS, works offline.
8. **FAQ**: cheating, undoing a point, scores below zero, ties.
9. **About**: version, short credits, free, no tracking and no accounts (no promise about ads), optional feedback link.

Implementation notes:

- Text lives in each language's i18n files under `help.sections.<id>` (a title plus a list of items). The section ids and item structure are shared across languages, only the text is translated.
- Default values quoted in the Settings guide come from `src/config/defaults.ts` and are interpolated into the text, never typed in, so they cannot go out of date.
- The in-game "?" overlay and a guided tutorial game are out of scope for now. The Settings screens may link to the Settings guide section later.

### 5.3 Setup and board (milestone 3)

- Routes: `/setup` (one page with three steps: Teams, Categories, Mode and settings) and `/board`. Home's **New game** goes to `/setup`.
- The setup draft lives in a `setup` Pinia store. Teams and categories start fresh each time, but the chosen mode and the game settings are saved (`pantomime:setup`) and used as the starting values of the next game; Reset to defaults restores the defaults. Starting the game calls `createGame` and stores the result in a `game` store, then goes to `/board`.
- **Navigation:** Back and Next (Start on the last step) sit at the top, directly below the step bar, so they stay reachable when a step grows long. They scroll with the page.
- **Teams:** 2 to 6 rows, each a row of color swatches (the palette in `config/teamColors.ts`) plus a remove button, and an add button. New teams take the first free color. Colors already used by another team are disabled, so colors are always unique.
- **Team identity:** a team is its color (`Team.color`, a palette id; there is no name field). Sentences that need a name use the localized color name ("Red team"). The team's color is used wherever the team appears: score cards and played tiles on the board, the turn header, result lines, the gold round and the final ranking. Color is never the only signal: score cards, sentences and rankings also carry the color name as text or an accessible label.
- Games saved before colors existed get palette colors by team order.
- **Categories:** selectable cards from the language's `src/packs/<lang>/index.json`. All categories start selected. An **Add all categories** button above the cards selects every category (it becomes **Clear selection** once all are selected). A live line shows the selection count, the minimum (`ceil(teams / 3)`), and the resulting tile count after trimming. Next is disabled until the minimum is met. If the team count shrinks below the selection's needs the step re-validates.
- **Mode:** two selectable cards (single-word is the default, multi-word), each with its title and short description. Below them a **Game settings** button and a one-line summary of the current mode's key values (for example turn time or timers, skips, gold round on/off) so players can see the rules without opening anything. The button opens a full-screen dialog (maximized, with a sticky **Cancel** and **Done** buttons, so they stay usable in landscape; Cancel, Esc and the back gesture discard the changes made since the dialog opened, Done keeps them) holding every setting in three sections: **Scoring** (points of easy, medium and hard tiles, shared by both modes), **Timing and rules** (only the current mode's settings; defaults from `config/defaults.ts`; skip limit has an "unlimited" switch) and **Gold round** (toggle, with bonus and penalty only while on). The dialog has a **Reset to defaults** button. Numbers use steppers with sensible ranges. Settings of both modes are kept while switching modes.
- **Board:** one row per category (title, then three tiles for difficulty 1 to 3 side by side), so the board stays readable with many categories and scrolls down, team scores with the current team highlighted, played tiles are outlined and show the playing team's name and its net points for that turn, plus a second line "team +n" (no label) when another team stole them. Tapping a tile only records the pick in the `game` store until the turn screens exist (milestone 4).
- Packs in this milestone contain only the category index (id, name). Words arrive with the turn screens and the pack work (milestones 4 and 7).

### 5.4 Turns, gold round and results (milestone 4)

- Routes: `/turn` (all phases of one normal turn), `/gold`, `/results`. Tapping a board tile stores the pick and opens `/turn`. Opening a game route without a game redirects home.
- **Handoff back button:** the handoff screen has a Back button that returns to the board and clears the picked tile, so the team can choose another tile. It exists only in the handoff phase (once a word has been shown, the turn cannot be undone).
- **Turn phases:** `handoff` (team, category, points, one big button), then the mode's play phase, then `result` (points gained), then back to the board, or on to the gold round or the final results depending on the new game status.
- **Multi-word play:** the handoff button reveals the first word and starts the timer. Correct adds a word, Skip shows the remaining skips and applies the penalty, and is disabled at the limit. When time ends and "finish the current word" is on, the current word stays up with Correct and Done, otherwise the turn ends at once. An empty word deck ends the turn early.
- **Single-word play:** handoff, then the word is shown with the one allowed Reroll (before Start, costs the reroll penalty), then Start covers the word and starts the timer. Hold to peek. Guessed scores the tile's points plus the fast-guess bonus. Give up needs a second tap within 3 seconds. A timeout or give up is a failure, followed by the steal phase if enabled (the next team guesses, the judge taps Correct or Wrong, a correct steal gives that team the tile's points).
- **Gold round:** an intro naming the team, then the single-word play with the difficulty-3 timer and a word from the gold pool, then the outcome. Success ends the round at once.
- **Results:** ranking with ties (1, 1, 3), the winner highlighted, Play again (to setup) and Home.
- **Result screen:** a title, then a **points card** (each team that scored as a colored pill with its signed points on the opposite side, or "No points this turn"; below a divider the breakdown lines that apply, each with an icon: fast-guess bonus, skip penalty (multi-word) and word-change penalty (single-word)), then a **words card** (caption, then one row per word shown with its Hide button at the end, rows separated by dividers; the single-word "The word was" line when no list is shown; the last-word and no-more-words notices). Content is top-aligned and starts-aligned (follows the page direction); the Continue button is a full-width sticky bar at the bottom.
- **Timer:** computed from a deadline timestamp (not by counting ticks), so it stays correct when the browser throttles timers. It turns red in the last 10 seconds. Sound and vibration cues come in milestone 8.
- **Word history:** persisted across games, see 3.3 and 6.3. Each game draws words in the language chosen at the start.
- **Word packs:** one JSON file per category per language (`src/packs/<lang>/<id>.json`, schema in 3.1) and `gold.json`. The words are small AI-drafted starter sets, **not yet reviewed by the owner**, and milestone 7 grows them.

### 5.5 Word packs screens (milestone 7)

- Home's **Categories and words** opens `/packs`: the current language's categories (built-in and custom, with the number of custom words), a **Gold words** entry, **New category**, **Export** and **Import**.
- Tapping a category opens `/packs/:id`: for each difficulty (easy, medium, hard) the number of built-in words, the list of custom words with a delete button, and an input to add a word. Custom categories also have rename and delete. `/packs/gold` is the same for the gold pool (one list).
- Deleting a category or a word asks nothing for single words and asks for confirmation for a whole category.

## 6. Technical Design

### 6.1 Project

- Quasar CLI with Vite, Vue 3, TypeScript (strict), Pinia, vue-i18n, Vue Router.
- PWA mode (Workbox, `GenerateSW` or `InjectManifest`). Precache the app shell, fonts and bundled packs.
- Tests: Vitest for game logic (board building and trimming, scoring, word selection).

### 6.2 Deployment (host-agnostic, subfolder)

- **Router mode: hash**, so no server rewrite rules are needed and subfolder moves are safe.
- Base path is a build-time variable (`PUBLIC_PATH`, default `./` or `/pantomime/`) wired to Quasar `publicPath`.
- Manifest `start_url` and `scope` are relative to the base path. Service worker scope is the subfolder.
- Build output is plain static files, ready for GitHub Pages, Cloudflare Pages, Netlify or PHP shared hosting.
- **Current host: GitHub Pages**, project site at `https://<user>.github.io/pantomime/` (repo named `pantomime`; Pages cannot serve a free-form path like `/games/pantomime/`). `.github/workflows/deploy.yml` type-checks, tests, builds (`quasar build -m pwa`, relative paths) and publishes `dist/pwa` on every push to `main`. One-time setup: repo Settings, Pages, Source: GitHub Actions.
- **Final host: own server at `/games/pantomime/`.** Copy the same `dist/pwa` build into that folder, no rebuild needed (verified locally under `/games/pantomime/`: page, service worker scope, manifest, icons and offline reload work).
- Browser storage is per address, so moving hosts means installs, saved games and custom words do not carry over: reinstall and use the packs export and import. Treat the GitHub address as temporary.

### 6.3 State and persistence

- Pinia stores: `settings`, `game`, `packs`, `history`.
- Settings, the active game, the word history and custom words live in localStorage (`pantomime:settings`, `pantomime:game`, `pantomime:history`, `pantomime:custom`). IndexedDB is not used, see 3.2.
- **Auto-save** whenever the game state changes (every finished turn, gold attempt and the start of a game). Saved data carries a `version`, and unreadable or mismatched data is ignored.
- A "Resume game" button appears on Home while a saved game is unfinished; it goes to the board, which redirects to the gold round if that is due. A finished game is not resumable (its results page is only reachable right after the game). Of the setup draft only the mode and game settings are saved.
- **A turn interrupted mid-play is not saved**: on resume the picked tile is still unplayed and the team picks again. Words already shown stay in the history, so they count as used.
- Word history persists across games and is saved as words are shown.

### 6.4 Folder structure (planned)

```
src/
  config/app.ts          # app name
  config/defaults.ts     # default game settings (also quoted by Help)
  i18n/languages.ts      # per-language config: dir, font, numerals
  i18n/<lang>/           # UI strings
  packs/<lang>/          # bundled word packs
  game/                  # pure TS logic: board, scoring, selection, rules
  stores/                # Pinia stores
  pages/ components/ layouts/
  services/              # audio, vibration, wake lock, storage, install, share
  css/                   # theme variables, RTL helpers
tests/                   # Vitest
```

### 6.5 Data model

The source of truth is `src/game/types.ts` (pure TypeScript, no Vue). Differences from the first sketch:

- `GameState.settings` holds all of `multi`, `single` and `gold`, and `mode` selects which one applies.
- `goldQueue` is always an array (empty outside the gold round) and `status` is `playing | gold | finished`. Setup is handled by the setup screens before `createGame`.
- `skipLimit` is `number | null`, where `null` means unlimited.
- Game logic never calls `Math.random` directly: every function that needs randomness takes an `Rng`, so tests are deterministic (`seededRng`).

### 6.6 Game logic modules (`src/game`)

| Module       | Responsibility                                                                         |
| ------------ | -------------------------------------------------------------------------------------- |
| `board.ts`   | Tile building and trimming, team and category limits                                   |
| `words.ts`   | Draw order for a tile pool: unseen words first, no repeats, history exhaustion check   |
| `scoring.ts` | Multi-word tally, single-word success and fast bonus, reroll delta, steal team, skips  |
| `game.ts`    | `createGame`, `finishTurn` (applies score deltas, alternates teams, starts gold), gold |
| `gold.ts`    | Gold queue: all non-leaders, lowest first, random ties, empty if all tied              |
| `ranking.ts` | Ranking with ties (1, 1, 3) and leaders                                                |

Setup rule (decided): a game needs at least `ceil(teams / 3)` categories, otherwise trimming would leave some team with no tile. Teams are never allowed to sit out. `buildBoard` throws if the rule is broken and the setup UI enforces it before that.

## 7. Milestones

1. Scaffold the project: Quasar, TS, PWA, i18n, RTL, hash router, base path.
2. Game logic with tests (board, trimming, scoring, word selection, gold). Done, see 6.6. Run with `npm test`.
3. Setup flow and board screens (see 5.3).
4. Turn screens (multi and single), steal, gold round, results (see 5.4).
5. Persistence and resume (see 6.3). Done.
6. Help page (can start earlier, text is refined as features land). Done, text still being refined.
7. Word packs: custom words and categories, import and export (3.2, 5.5). Growing the starter word lists (40 to 60 words per difficulty) is a separate content pass that needs the owner's review.
8. Polish: sound, vibration, wake lock, themes, install prompt, share.
9. Deploy to a subfolder (workflow and local subfolder test done; publishing and testing the install on Android and iOS need the repo to be pushed).

## 8. Risks and Notes

- iOS PWA limits: wake lock and vibration support varies (Vibration API is unsupported on iOS Safari). Features must degrade gracefully.
- Audio needs a user gesture to start on mobile (handled by the existing taps).
- Persian pack quality depends on owner review.

## 9. Ideas

- "My words", as a tile, with difficult bonus
- Success rates for the words
