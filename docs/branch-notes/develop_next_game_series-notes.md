# Branch Notes: develop_next_game_series

## 1. Discoveries & Deviations
- **PR #27 Merge Conflict Reconciliation:** Reconciled `origin/main` into `develop_next_game_series`. Identified module ID collision on `'031'` between Board 2's `StereoPannerModule` (from main) and Board 4's `PitchRibbon` (from develop).
- **Module ID Architecture:** Assigned `StereoPannerModule` to ID `'013'` under Board 2 (The Luminary Board), preserving `'031'` for `PitchRibbon` in Board 4 in compliance with the 100 Digital Busy Board specification.
- **Color System Tokens:** Integrated the refined 5-token OKLCH color palette (`--color-parchment`, `--color-red`, `--color-indigo`, `--color-sienna`, `--color-cord`) and dynamic mix helper tokens (`--color-red-hover`, `--color-indigo-hover`) in `src/style.css`.
- **Game Registry Expansion:** Updated total registered games assertion to 23 to account for `ToneLuminaryBoardGame`.

## 2. Blockers & Risks (4a)
- All active merge conflicts resolved and staged.
- 0 blocker issues. 35 test files / 168 unit tests passing with 100% green rate.
- TypeScript compiler (`tsc --noEmit`) and Vite PWA production build execute cleanly.

## 3. Out-of-Scope Opportunities (4b)
- **Code Splitting / Chunk Optimization:** Vite bundle outputs `index-*.js` (>500 kB). Implement dynamic `import()` for lazy-loading individual game modules and heavy audio dependencies (Tone.js).
- **Test Helper Deduplication:** Extract reusable `createMockCanvas` and `createMockAudioContext` utilities into `test/helpers/mockEnvironment.ts` to eliminate duplicate boilerplate across BusyBoard test suites.
