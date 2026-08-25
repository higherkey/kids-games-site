# Kipu v4: Phase 3 New Games Implementation Plan

This master proposal outlines the expansion batches for **Kipu** games as defined in the Phase 3 Roadmap. Games are structured into modular suites tailored for young learners, maintaining Kipu's core design standards (Fredoka typography, zero audio latency, Capacitor haptics, offline canvas performance, and high visual polish).

---

## 1. Game Expansion Batches

### Batch A: Creative & Rhythm Suite (Sandbox & Workshop Portals)
1. **CloudShapeFinder** (`src/games/cloudShape/`): Interactive Sky & Soft Cloud Animal Morpher (Sandbox Portal).
   - *Concept*: Drifting procedural sky with puffy cumulative clouds.
   - *Interactions*: Tapping or dragging across floating clouds causes them to morph smoothly into animal shapes (Elephant, Duck, Whale, Lion, Butterfly) with soft particle dust, chime audio, and wind haptics.
2. **DigitalLiteBrite** (`src/games/liteBrite/`): Neon Light Peg Matrix & Template Tracing Board (Workshop Portal).
   - *Concept*: Dark matrix pegboard with glowing translucent acrylic pegs.
   - *Interactions*: Color selector palette (Neon Red, Cyan, Yellow, Lime, Magenta, Orange, White). Tap to insert glowing pegs with a click sound. Includes template tracing modes (Heart, Star, Animal shapes) and clear/glow animations.
3. **AnimalChoir** (`src/games/animalChoir/`): 4x4 Singing Animal Grid Sequencer & Rhythm Studio (Workshop Portal).
   - *Concept*: Interactive grid choir with animated singing animals.
   - *Interactions*: 4x4 interactive grid where tapping animal cards (Cat, Dog, Frog, Duck, Bird, Bear, Pig, Owl) triggers pitched vocal barks/meows/quacks matched to musical notes (C4-C5 scale). Includes a loop sequencer bar that sweeps across columns.

### Batch B: STEM & Physics Logic Suite (Lab Portal)
1. **EquationTower** (`src/games/equationTower/`): Matter.js Stacking Blocks & Math Balance Game.
   - *Concept*: Falling numbered blocks stack into a stable tower while matching target sums or height goals.
2. **VibeCoder** (`src/games/vibeCoder/`): Visual Directional Logic & Grid Pathfinding.
   - *Concept*: Drag/tap command arrows (Up, Down, Left, Right, Jump) to guide a character through grid mazes to collect treats.
3. **TrashSorcerer** (`src/games/trashSorcerer/`): Physics Flick & Portal Sorting Game.
   - *Concept*: Fast-paced sorting of falling/sliding items into recycling, compost, and trash portals using flick gestures and gravity physics.

### Batch C: KhipuSynth Audio & Music Studio (Lab Portal)
- **KhipuSynth** (`src/games/khipuSynth/`): Full 8-track loop maker, multi-synth instrument grid, customizable BPM slider, live frequency visualizer, and client-side WAV audio recorder/exporter.

### Batch D: Digital Busy Board Expansion (Boards 4 & 5)
- **Board 4: Sound & Wave Studio** (Pitch Ribbon, Siren Pull, Morse Telegraph Key, Bass Plunger).
- **Board 5: Typography & Core Interface Board** (Odometer Tumbler, Font Weight Morph, Word Gravity Switch).

---

## 2. Technical Architecture & File Structure

```text
src/
├── core/
│   ├── AudioController.ts
│   ├── SynthEngine.ts
│   ├── HapticController.ts
│   └── GameRegistry.ts
└── games/
    ├── cloudShape/
    ├── liteBrite/
    ├── animalChoir/
    ├── equationTower/
    ├── vibeCoder/
    └── trashSorcerer/
```

## 3. Verification & Quality Standards

- **Unit Testing**: Vitest suites for each game lifecycle (`init`, `update`, `pause`, `resume`, `destroy`).
- **Performance**: 60 FPS HTML5 Canvas / Matter.js rendering on mobile devices.
- **Audio & Haptics**: Zero-latency Web Audio / `@capacitor/haptics` triggers with proper audio node cleanup to avoid memory leaks.
