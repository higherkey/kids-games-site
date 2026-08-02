# Kipu

> A tactile, sensory, and educational mini-game suite for children — inspired by the Andean khipu, the knot-based recording system of the Incan Empire.

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/richardlitt/standard-readme)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=flat-square)](https://kipu-games.vercel.app/)
[![Build Status](https://github.com/higherkey/kipu/actions/workflows/build.yml/badge.svg)](https://github.com/higherkey/kipu/actions/workflows/build.yml)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-007ACC?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](#)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.20-EF5350?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**Kipu** (from Quechua *khipu*, "knot") is a mobile-first web platform hosting high-performance, tactile mini-games designed for children ages 2–10. The design honors the khipu as an intellectual achievement — emphasizing that touch and connection are vehicles for meaning. Our primary focus is **immediate tactile engagement**—ensuring zero perceptible latency between touch events and their corresponding audio/haptic responses.

## Table of Contents

- [Background](#background)
- [Design System](#design-system)
- [Game Catalog](#game-catalog)
- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Background

Built with a "Sensory-First" philosophy, Kipu transforms a standard web browser into a responsive, near-native playground. The name and visual system are rooted in the Andean khipu — a sophisticated, three-dimensional tactile language encoded through the color, type, and position of knots on suspended strings.

### Key Features

- **Zero-Latency Feedback**: Optimized event handling and pre-cached audio sprites ensure instant gratification.
- **PWA Ready**: Fully installable on mobile home screens with robust offline support via Service Workers.
- **Sensory Excellence**: Games provide rich visual, auditory, and haptic stimulation.
- **Robust Architecture**: Clean MVC/ECS patterns separating logic from rendering for maximum performance.
- **Haptic Integration**: Native vibration feedback synchronized with every interaction.
- **Cultural Integrity**: The design avoids "tribal" clichés in favor of organic textures, mathematical precision, and warm parchment tones that honor the khipu's intellectual legacy.

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Core | Vite 8 + TypeScript 6 + HTML5 Canvas |
| Physics | Matter.js 0.20 |
| Audio | Howler.js 2.2 |
| Haptics | Web Haptics API (`HapticController`) |
| PWA | vite-plugin-pwa + Service Workers |

### Sound Design & Auditory Philosophy

Kipu follows a strict **Tactile Sound Design Mandate** (see [.agents/sound-design-rules.md](.agents/sound-design-rules.md)):
- **Gentle & Non-Fatiguing:** Audio uses warm sine/triangle waveforms, low-pass filtering (1200Hz–2500Hz), and soft attack envelopes to protect young ears and prevent auditory fatigue.
- **Impactful Mechanical Weight:** Toggles, latches, and switches emphasize warm, felt/wood mechanical clacks (60Hz–250Hz) rather than high-pitched metallic snaps (benchmarked by the Contrast Inverter click).
- **Smooth Motion Glissando:** Continuous controls (sliders, dials, pucks) use real-time pitch-bending glides (`startGlide`, `updateGlide`, `stopGlide`) restricted to comforting mid-frequency registers (120Hz–650Hz).

---

## Design System

Kipu uses a three-tier design framework:

| Tier | Scope | Visual Execution |
|------|-------|-----------------|
| **Tier 1** | Primary Cord (Main Menu & Navigation) | Organic fibrous textures, parchment tones, cochineal red & indigo accents. Navigation icons hang like secondary strings from a central horizontal cord. |
| **Tier 2** | String Families (Game Categories) | STEM: geometric grid-based weaving. Music: vibrating, glowing strings. Sensory: soft, wool-like textures and natural materials. |
| **Tier 3** | The Knots (Individual Games) | Distinct styling per game. Global/Sectional elements are relegated to UI borders, exit buttons, and navigation breadcrumbs. |

### Color Palette

- **Background**: `#F5EDD8` (warm parchment)
- **Primary / Cochineal Red**: `#B5342A`
- **Secondary / Indigo**: `#2D3875`
- **Accent / Amber**: `#C98B2F`
- **Text**: `#1E1A14`

---

## Game Catalog

### Sensory Play (POC)

| ID | Name | Kipu Name | Description |
|----|------|-----------|-------------|
| `poka` | Bubble Wrap | Poka | Tap bubbles in a grid. Haptic intensity correlates to tap velocity. |
| `eeno` | The "No" Button | Eeno | A silly audio toy. A large button with 20+ "No" variations and squash-and-stretch animation. |
| `maka` | Color Mixer | Maka | Drag and merge colored blobs to learn primary/secondary colors. Canvas `globalCompositeOperation` blending. |
| `tapa` | Balloon Pop | Tapa | Tap rising balloons before they escape. Matter.js collision detection. |
| `nuko` | Bug Catcher | Nuko | Search-and-find a hidden bug layered beneath scene sprites. Focus and slow scanning encouraged. |

### STEM & Logic (MVP)

| ID | Name | Description |
|----|------|-------------|
| `equationTower` | Equation Tower | Stack numbered blocks to match a target equation sum. Matter.js physics. |
| `marblePipeRun` | Marble Pipe Run | Connect pipe pieces on a grid so a marble can travel from start to finish. |
| `soundMemory` | Sound Memory | Simon-style auditory pattern recognition. Animal icons pulse when they make their sound. |
| `cloudShapeFinder` | Cloud Shape Finder | Find procedurally generated shapes hidden in clouds. Low-stress discovery mechanics. |
| `digitalLiteBrite` | Digital Lite-Brite | Trace a glowing path by placing colored pins. Snapping haptics. |
| `trashSorcerer` | Trash Sorcerer | Flick trash items into the correct recycling bin. Velocity-based gesture detection. |

---

## Install

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- npm

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/higherkey/kipu.git
   cd kipu
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Usage

### Local Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Tests

```bash
npm run test
```

---

## Contributing

Please review [PROJECT.md](file:///c:/Programming/kipu%20-%20kids%20games/PROJECT.md) and [KidsGames_Web_Technical_Specification.md](file:///c:/Programming/kipu%20-%20kids%20games/docs/KidsGames_Web_Technical_Specification.md) for our sensory-first coding standards and architecture before making changes. Ensure any testing changes align with our `testing-kipu` plugin workflow.

### Project Roadmap

- **Phase 1: Proof of Concept** — Complete
  - [x] Core Infrastructure & PWA Setup
  - [x] Poka (Bubble Wrap), Eeno (No Button), Tapa (Balloon Pop)
  - [x] Maka (Color Mixer), Nuko (Bug Catcher)
- **Phase 2: Minimum Viable Product** — Complete
  - [x] Equation Tower
  - [x] Marble Pipe Run
  - [x] Sound Memory
  - [x] Cloud Shape Finder
  - [x] Digital Lite-Brite
  - [x] Trash Sorcerer
- **Phase 3: Post-Launch Expansion**
  - [ ] 3D Pizza Physics
  - [ ] Multiplayer / collaborative modes

---

## License

This project is licensed under the MIT License. Audio assets are CC0 unless otherwise specified.
