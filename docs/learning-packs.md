# Language learning: word language and learning packs

Status: plan, nothing implemented yet. Last updated 2026-11-22.

## 1. Goal

Make the game useful for people learning a language, starting with German. Players act out and
guess words in the language they are learning, while the app stays in a language they already
speak.

Two changes make that possible:

1. The **word language** becomes independent of the **interface language**.
2. A language can have **learning packs**: vocabulary sorted by CEFR level (A1 to C2) and still
   grouped in the usual categories (Food, Animals, ...).

## 2. Decisions already made

- Word language and interface language are separate settings.
- German is added as a word language with **normal packs** (the same categories as English and
  Persian) and **learning packs**.
- The setup flow is: word language, then pack type (Normal or Learning), then CEFR levels (Learning
  only), then categories.
- Levels can be combined (A1+A2). Combining merges the levels' words **into each category's pool**.
  There is no separate tile column per level.
- Learning words stay in categories, so players still choose "Food" or "Animals" to play.
- The 3 difficulties keep their current meaning (how hard the word is to act out). They are not CEFR
  levels.
- The packs screen stays a per-language screen (see section 6, step 8).

## 3. Decisions on the open questions

All six were decided on 2026-11-22, following the recommendations.

| # | Question | Decision |
|---|----------|----------|
| 1 | Gold round in Learning mode | Off for Learning (no level-appropriate pool). Normal German packs keep their own gold pool. |
| 2 | Custom categories and words in Learning mode | Not supported in v1 (Normal packs only). Hiding a built-in word works in both. |
| 3 | Where "Word language" is chosen | In Setup (first step, remembered), not in global Settings, so a game's content is chosen with the game. |
| 4 | German interface (`src/i18n/de`) | Not in v1. German is a word language only. |
| 5 | Word source for A1 to B1 | Write our own lists. The Goethe-Institut lists are the reference for what belongs in a level, but their licence must be checked before copying. |
| 6 | Seen-history key | Include the sorted level set, for example `de:learning:a1+a2` (see section 4.4). |

Nothing blocks the implementation plan any more.

## 4. Design

### 4.1 Content descriptor

Today a game's content is identified by one string, the language code (`settings.language`). Introduce
a small descriptor used wherever content is chosen:

```ts
type PackKind = 'normal' | 'learning';
type Level = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';

interface Content {
  lang: string;        // word language: 'de', 'en', 'fa'
  kind: PackKind;
  levels: Level[];     // empty for normal packs, at least one for learning
}
```

`settings.language` stays the interface language only. Setup holds a `Content` draft and the game
store saves the `Content` it started with (see 4.4).

### 4.2 Pack files

Normal packs are unchanged: `src/packs/<lang>/<category>.json` and `src/packs/<lang>/index.json`.

Learning packs live next to them and use a new folder, so the existing `@/packs/*/*.json` glob does not
pick them up by accident:

```
src/packs/de/index.json                       normal categories
src/packs/de/food.json                        normal pack, same shape as en/fa
src/packs/de/learning/index.json              learning categories and the levels each exists at
src/packs/de/learning/a1/food.json
src/packs/de/learning/a1/animals.json
src/packs/de/learning/a2/food.json
...
```

A learning category file has the existing shape plus a level, and room for translations later:

```jsonc
{
  "schema": 1,
  "id": "food",
  "lang": "de",
  "level": "a1",
  "version": 1,
  "name": "Essen und Trinken",
  "words": { "1": ["Brot", "Apfel"], "2": ["Suppe"], "3": ["Gabel"] },
  "hints": { "Suppe": "..." },
  "glosses": {}          // reserved, empty in v1 (see section 7)
}
```

`learning/index.json` lists categories and the levels that have a file for each:

```jsonc
{
  "schema": 1,
  "lang": "de",
  "categories": [
    { "id": "food", "name": "Essen und Trinken", "levels": ["a1", "a2", "b1"] }
  ]
}
```

Rules for learning packs:

- Same word rules as normal packs (length, characters, no duplicates inside a file).
- A word may appear in only one level of a category. A test enforces this, so merging levels never
  produces duplicates.
- Size target: 10 to 20 words per difficulty per category per level (normal packs keep 40 to 60). A
  merged A1+A2 pool is then 20 to 40 words per difficulty.
- Category names in the index are in the word language, like the normal packs' names.

### 4.3 Building a pool

`services/words.ts` gets a content-aware pool builder. For a category and difficulty it returns:

- Normal: today's `getPool(lang, categoryId, difficulty)`.
- Learning: the union over the selected levels of that level's built-in words at that difficulty, with
  hidden or moved words applied, in the same way `builtinPool` does today, deduplicated by
  `compareKey`.

`listCategories` keeps its rule (a category needs at least one word at every difficulty) and applies it
to the merged pool. A category that has too little at the selected levels simply does not appear.

`categoryWordCount`, `hintFor` and `nativeLevel` get the same content argument.

### 4.4 Storage and history

- **Placements (hidden or moved words)** are stored per language today. For learning, the key adds the
  level: a word is placed per `lang/level/category`. A learning word hidden in A1 stays hidden when
  A1 is part of any combination.
- **Seen history** is stored per language, then pool id. For learning, the namespace includes the sorted
  level set (`de:learning:a1+a2`). `deckFor` drops history for words that left the pool, so sharing
  one namespace between different level combinations would erase A2's history when you play A1
  alone.
- **Saved game and resume**: `SavedGame` stores `lang` today. It gets a `content` field. A save without
  one is read as `{ lang, kind: 'normal', levels: [] }`.
- **Saved setup**: setup remembers `content`, and `categoryIds` and `knownCategoryIds` keep working
  because category ids are shared between kinds ("food" is "food").
- **Custom data export and import** is Normal only in v1, so the export format and `schema: 1` do not
  change.

### 4.5 Setup UI

Added at the top of the Categories step in `SetupPage.vue`:

1. Word language picker. Hidden when only one language has packs.
2. Pack type: Normal or Learning (segmented toggle). Hidden for languages without learning packs.
3. Level chips A1 to C2 for Learning, multi-select, at least one stays selected. Levels with no
   words for the language are disabled.
4. The existing category list, built from the merged pools, with word counts.

The tile preview, the trimmed-tiles note and the minimum-categories rule do not change.

## 5. Out of scope for v1

- A German interface translation.
- Learning packs for English and Persian.
- Custom words and categories inside Learning mode.
- Translations (glosses) and a review screen (section 7).
- Gold round for Learning packs.
- Remote pack updates for learning packs (the existing section 3.4 idea in `DESIGN.md` still applies
  later).

## 6. Implementation plan

Each step leaves the app working and the tests green. Run `npm run lint`, the unit tests and the
e2e smoke test after each. No step commits on its own.

1. **Add German as a word language, normal packs only.** (Done 2026-11-22.)
   - Add `src/packs/de/` (index, categories, gold) with a first small set so the pack tests have data.
   - The word language list (`src/i18n/languages.ts` has the interface languages) needs a separate list
     of word languages, since German has no interface. Add `src/config/wordLanguages.ts`.
   - Tests: extend `tests/content/packs.test.ts` to cover `de`.

2. **Separate word language from interface language.** (Done 2026-11-22.)
   - Add `wordLanguage` to the setup store (remembered), defaulting to the interface language.
   - Replace `settings.language` with the word language where it selects content: `SetupPage.vue`
     (`listCategories`, `categoryWordCount`, the `start` call), the game store's `lang`, `PacksPage.vue`,
     `PackEditPage.vue`.
   - Keep `settings.language` for UI text, number formatting and direction.
   - RTL and LTR: words are shown in the word language's direction. Check the Turn page and the board
     with a German word in an RTL interface and the reverse.
   - Tests: setup store, `SetupPage` (changing the word language changes the category list), game store.

3. **Introduce `Content` and thread it through the services.**
   - Add the `Content` type (section 4.1) in `game/types.ts`. Normal behaviour stays identical.
   - Game store: `SavedGame.content`, migration for old saves, history namespace helper.
   - Tests: old save loads as normal, history namespaces differ per level set.
   - Done (2026-11-22): the type, `src/game/content.ts` helpers, game store and tests. The `lang`
     arguments in `services/words.ts` and `services/packs.ts` were **not** changed yet: nothing there
     depends on the level before the learning loader exists, so that part moved to step 4.

4. **Learning pack loader.**
   - `services/learningPacks.ts`: glob `@/packs/*/learning/*/*.json` and the learning indexes, expose
     `listLearningCategories(lang, levels)`, `learningWords(lang, level, categoryId, difficulty)`.
   - Extend `builtinPacks.ts` and `words.ts` with the merged pool (section 4.3). This is also where the
     `lang` arguments in `services/words.ts` and `services/packs.ts` (`getPool`, `listCategories`,
     `categoryWordCount`, `hintFor`, `nativeLevel`) become `Content`, postponed from step 3. Callers
     (`game.content` in the game store, the setup draft) then pass the content. Normal behaviour stays
     identical.
   - Tests: merge of two levels, a category that disappears when one difficulty is empty, dedupe.

5. **Storage keys for learning.** (Follows decisions 2 and 6 in section 3.)
   - Placement keys per level, history namespace with the level set, hide support from the result
     screen in Learning mode, custom add/remove disabled in Learning mode.
   - Tests: hiding a word in A1 does not affect A2; history survives switching level sets.

6. **Setup UI.**
   - Pack type toggle and level chips (section 4.5), remembered in the setup store.
   - Gold round hidden or disabled for Learning (decision 1 in section 3). Check `GoldPage` entry points and
     the settings screen's gold options.
   - i18n strings in `src/i18n/en` and `src/i18n/fa`, and the Help page text (`src/i18n/help.ts`).
   - Tests: `SetupPage` for each toggle, the minimum-categories rule with merged pools, `i18n` key parity
     test.

7. **Content tests.**
   - `tests/content/learning.test.ts`: file shape, `level` matches the folder, index matches files, no
     word in two levels of one category, `hints` keys exist in `words`, size minimums per level.

8. **Packs screen.**
   - `PacksPage.vue` shows the Normal packs of the selected word language. A short note links to Setup for
     Learning packs, and the hidden words of learning packs can be shown again there (grouped by
     level), because hiding is allowed in Learning mode.
   - Tests: `PacksPage` for German, hidden learning words listed and restorable.

9. **German A1 content.**
   - Write A1 for all planned categories. Review with a German speaker if possible.
   - Check the pack tests and play a full game with A1 alone.

10. **German A2 and B1 content**, one level at a time, each with a combined-level play test (A1+A2,
    A1+A2+B1).

11. **Docs and release.**
    - Update `DESIGN.md` (sections 2, 3 and 4: setup flow, pack format, storage, screens) and the
      README.
    - Bump the version and note the new feature.

Steps 1 to 8 can be tested with a handful of placeholder words per level. Steps 9 and 10 are content
work and are where most of the effort goes.

## 7. Future work

- **Glosses**: show the translation (interface language) next to each word on the result screen, from
  the reserved `glosses` map. This is the first thing to add after v1 because it turns a game round
  into vocabulary review.
- **Review screen**: after a game, a list of the words that were shown, with translations, and a way
  to keep difficult ones for next time.
- **B2, C1, C2 content.** These levels are abstract, so category choices and difficulties need
  thought. A1 to B1 first.
- **Learning gold pool**: a C1 or C2 gold round for Learning mode.
- **Custom words in Learning mode**, so teachers can add their own vocabulary for a class.
- **More languages**: Learning packs for English and Persian, and further word languages, using
  the same structure. A new language needs `src/packs/<lang>/` and an entry in the word language
  list. An interface translation stays optional.
- **German interface** (`src/i18n/de`).
- **Article and grammar aids**: showing the article (der, die, das) as a hint option for German nouns.
- **Level-aware scoring**: rewarding harder levels when several are combined.
- **Remote updates** for learning packs through the packs manifest.

## 8. Risks

- **Content volume.** About 10 to 20 words × 3 difficulties × categories × levels is a lot of words
  and needs a reviewer. Mitigation: A1 first, ship when A1 to A2 are ready.
- **Pool size at a single level.** A single level has few words per category, so decks run out fast and
  the history resets often. The 10 to 20 word target and the combined-level choice both help.
- **Words that are hard to act.** Many A1 to B1 words are abstract or grammatical (prepositions,
  articles). Learning packs should favour nouns, verbs and adjectives that can be acted, and the
  acting hints can help for the rest.
- **Direction mixing.** A German word inside an RTL interface (or Persian words with a German
  interface later) needs `dir` handled per word, not only on `<html>`.
- **Migration.** Old saved games and setups have no `content`. Reading them as Normal must stay tested.
