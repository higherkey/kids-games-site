# Feature Trace: Busy Board & Game Architecture Refactoring

## 1. Planned Work
- **TODO List**:
  - [x] Create game base class `BaseBusyBoardGame.ts`
  - [x] Refactor games `SwitchboardGame`, `MechanicalWorkshopGame`, and `LuminaryBoardGame` to extend it
  - [x] Implement robust pointer cancellation handling (`mouseleave`, `touchcancel`)
  - [x] Create module base class `BaseBusyBoardModule.ts`
  - [x] Refactor 29 busy board modules to extend `BaseBusyBoardModule`
  - [x] Create global `BaseGame.ts` abstract class
  - [x] Refactor all 10 non-busy-board games to extend `BaseGame`
  - [x] Refactor `BaseBusyBoardGame` to extend `BaseGame` (unifying entire hierarchy)
  - [x] Sonar code quality fixes across game files
- **File List**:
  - `src/core/BaseGame.ts` [NEW]
  - `src/games/busyBoard/BaseBusyBoardGame.ts` [NEW/MODIFY]
  - `src/games/busyBoard/modules/BaseBusyBoardModule.ts` [NEW]
  - `src/games/busyBoard/LuminaryBoardGame.ts` [MODIFY]
  - `src/games/busyBoard/SwitchboardGame.ts` [MODIFY]
  - `src/games/busyBoard/MechanicalWorkshopGame.ts` [MODIFY]
  - `src/games/busyBoard/modules/*.ts` (29 files) [MODIFY]
  - `src/games/balloonPop/BalloonPopGame.ts` [MODIFY]
  - `src/games/bubbleWrap/BubbleWrapGame.ts` [MODIFY]
  - `src/games/bugCatcher/BugCatcherGame.ts` [MODIFY]
  - `src/games/colorDropper/ColorDropperGame.ts` [MODIFY]
  - `src/games/colorMixer/ColorMixerGame.ts` [MODIFY]
  - `src/games/marblePipe/MarblePipeGame.ts` [MODIFY]
  - `src/games/noButton/NoButtonGame.ts` [MODIFY]
  - `src/games/particlePhysics/ParticlePhysicsGame.ts` [MODIFY]
  - `src/games/soundBoard/SoundBoardGame.ts` [MODIFY]
  - `src/games/soundMemory/SoundMemoryGame.ts` [MODIFY]
- **Rationale**: DRY/SOLID architecture — centralize AudioController/HapticController singletons and canvas binding into a single `BaseGame` base class, unifying all 11 game types under one inheritance tree.

## 2. In Progress Work
*(No active files in progress)*

## 3. Completed Work

### Phase 1 — Busy Board Base Classes
- **BaseBusyBoardGame.ts** — Game base class encapsulating layout, panning, pointer/touch coordinate translation, scroll indicator rendering, lifecycle handlers, and `mouseleave`/`touchcancel` cancel resilience.
- **SwitchboardGame / MechanicalWorkshop / LuminaryBoardGame** — Extended from base, removed duplicate canvas setup/pointer handling and obsolete `destroy()` overrides.
- **BaseBusyBoardModule.ts** — Module base class encapsulating `id/x/y/w/h`, audio/haptics engines, and empty no-op fallback handlers.
- **29 Module Files** — Extended `BaseBusyBoardModule`, removing ~500 lines of redundant boilerplate.

### Phase 2 — Global BaseGame Class
- **BaseGame.ts** — New abstract class implementing `Game`. Provides `audio`, `haptics`, `canvas`, `ctx` properties with initialization via a template-method `init() → onInit()` hook.
- **10 Standard Games** — All refactored to `extends BaseGame`: BalloonPop, BubbleWrap, BugCatcher, ColorDropper, ColorMixer, MarblePipe, NoButton, ParticlePhysics, SoundBoard, SoundMemory.
- **BaseBusyBoardGame** — Now also extends `BaseGame`, completing the unified hierarchy.

### Phase 3 — Sonar Code Quality Fixes
- **SoundMemoryGame.ts** — Replaced `any[]` on `activeTimeouts` with `ReturnType<typeof setTimeout>[]`. Removed empty constructor.
- **SoundBoardGame.ts, ParticlePhysicsGame.ts, ColorMixerGame.ts, NoButtonGame.ts** — Removed empty `constructor() { super(); }` boilerplate (5 files).
- **NoButtonGame.ts** — Replaced `void (el).offsetWidth` with `const _reflow = (el).offsetWidth` to fix Sonar void-operator warning.
- **MarblePipeGame.ts** — Extracted `startPress()` into 4 focused helpers (`handleToolboxPress`, `handleHeaderPress`, `handleSelectedPartMenu`, `pickOrDeselectPart`), reducing cognitive complexity from 26 to under 15.
- **MarblePipeGame.ts** — Introduced `SandboxPartType` type alias replacing 3 inline union type occurrences.
- **LuminaryBoardGame.ts** — Introduced `LuminaryTheme` type alias replacing 3 inline union type occurrences.
- **ColorDropperGame.ts, ColorMixerGame.ts** — Earlier Sonar fixes for `readonly` marking, `Math.hypot` modernization, and type aliases (`ColorChannel`, `PaintToolId`).
- **RotaryDimmer.ts, StrobeFrequency.ts, ShadowProjection.ts** — Cognitive complexity reductions via helper extraction; `dx`/`dy` declaration fixes.

## 4. Issues and Out of Scope
- **4a) Blockers**:
  - Local CLI sandbox tool execution is blocked (`opening NUL for ACL write: Access is denied.`). Prevents automated builds and `tsc --noEmit` checks. Static analysis used as substitute.
- **4b) Opportunities**:
  - Add `ctx!` non-null assertion guards at render entry points (currently marked MEDIUM in peer review). A guard `if (!this.ctx || !this.canvas) return;` at the top of each `update()` method would eliminate all non-null assertions safely.
  - Consider a dedicated `handlePointerCancel()` hook on `BusyBoardModule` to replace the `(-999,-999)` coordinate sentinel convention.
