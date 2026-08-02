# Tactile Sound Design Mandate & Guidelines

This document defines the core sound design principles for the **Kipu** kids mini-game suite. All synthesizers, audio controllers, and UI sound triggers MUST adhere to these rules.

---

## Core Sound Design Principles

### 1. Gentle & Non-Fatiguing
- **No Piercing Frequencies:** High-Q metallic resonances or frequencies above 3kHz MUST be strictly avoided or filtered out using master low-pass filters (1200Hz–2500Hz cutoff).
- **Soft Attack Envelopes:** Use smooth 10ms–40ms attack ramps to eliminate harsh digital pops and clicks.
- **Calibrated Volume:** Keep synthesizer output volumes between -8dB and -16dB master gain to protect young ears during extended play sessions.

### 2. Impactful & Tactile
- **Low-End Weight:** Toggles, latches, switches, and button presses MUST provide warm, satisfying mechanical weight (like felt/wood clacks, 60Hz–250Hz membrane pops) rather than high-pitched harsh metallic snaps.
- **Contrast Inverter Benchmark:** The warm wooden/felt click of the Contrast Inverter module serves as the quality benchmark for tactile toggle feedback.

### 3. Engaging Glissando (Smooth Motion Controls)
- **Continuous Pitch Glides:** Dragging sliders, rotary dimmers, crossfaders, and pucks MUST use continuous pitch-bent voices (`startGlide`, `updateGlide`, `stopGlide`) rather than rapid stuttering click/note repeats.
- **Restrained Pitch Register:** Keep glissando frequency sweeps within pleasant mid-frequency registers (120Hz – 650Hz) so drag interactions remain musical and comforting.
