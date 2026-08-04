import type { Game } from './Game';
import { NoButtonGame } from '../games/noButton/NoButtonGame';
import { BubbleWrapGame } from '../games/bubbleWrap/BubbleWrapGame';
import { BalloonPopGame } from '../games/balloonPop/BalloonPopGame';
import { ColorMixerGame } from '../games/colorMixer/ColorMixerGame';
import { ColorDropperGame } from '../games/colorDropper/ColorDropperGame';
import { BugCatcherGame } from '../games/bugCatcher/BugCatcherGame';
import { SoundMemoryGame } from '../games/soundMemory/SoundMemoryGame';
import { MarblePipeGame } from '../games/marblePipe/MarblePipeGame';
import { SoundBoardGame } from '../games/soundBoard/SoundBoardGame';
import { ParticlePhysicsGame } from '../games/particlePhysics/ParticlePhysicsGame';
import { SwitchboardGame } from '../games/busyBoard/SwitchboardGame';
import { LuminaryBoardGame } from '../games/busyBoard/LuminaryBoardGame';
import { MechanicalWorkshopGame } from '../games/busyBoard/MechanicalWorkshopGame';
import { CloudShapeGame } from '../games/cloudShape/CloudShapeGame';
import { LiteBriteGame } from '../games/liteBrite/LiteBriteGame';
import { AnimalChoirGame } from '../games/animalChoir/AnimalChoirGame';
import { EquationTowerGame } from '../games/equationTower/EquationTowerGame';
import { VibeCoderGame } from '../games/vibeCoder/VibeCoderGame';
import { TrashSorcererGame } from '../games/trashSorcerer/TrashSorcererGame';
import { KhipuSynthGame } from '../games/khipuSynth/KhipuSynthGame';
import { SoundWaveStudioGame } from '../games/busyBoard/SoundWaveStudioGame';
import { TypographyBoardGame } from '../games/busyBoard/TypographyBoardGame';

export interface GameRegistration {
  id: string;
  name: string;
  subtitle: string;
  portal: 'sandbox' | 'workshop' | 'lab' | 'busyBoard';
  icon: string;
  category: 'sensory' | 'brain' | 'action'; // Legacy v3 categories
  desc: string;
  constructorRef: new () => Game;
}

export class GameRegistry {
  private static instance: GameRegistry;
  private registry: Map<string, GameRegistration> = new Map();

  private constructor() {
    this.registerAll();
  }

  public static getInstance(): GameRegistry {
    if (!GameRegistry.instance) {
      GameRegistry.instance = new GameRegistry();
    }
    return GameRegistry.instance;
  }

  private registerAll() {
    const list: GameRegistration[] = [
      {
        id: 'noButton',
        name: 'Eeno',
        subtitle: 'The "No" Button',
        portal: 'sandbox',
        icon: 'no',
        category: 'sensory',
        desc: 'Play with funny voices and learn standard words in many languages!',
        constructorRef: NoButtonGame
      },
      {
        id: 'bubbleWrap',
        name: 'Poka',
        subtitle: 'Bubble Wrap',
        portal: 'sandbox',
        icon: 'bubble',
        category: 'sensory',
        desc: 'Pop colorful bubbles, hear funny pops, and feel satisfying haptic feedback!',
        constructorRef: BubbleWrapGame
      },
      {
        id: 'balloonPop',
        name: 'Tapa',
        subtitle: 'Balloon Pop',
        portal: 'workshop',
        icon: 'balloon',
        category: 'sensory',
        desc: 'Pop floating balloons of different colors and sizes!',
        constructorRef: BalloonPopGame
      },
      {
        id: 'colorDropper',
        name: 'Sutuy',
        subtitle: 'Color Dropper',
        portal: 'workshop',
        icon: 'droplet',
        category: 'brain',
        desc: 'Drop and merge paint drops to mix new colors programmatically!',
        constructorRef: ColorDropperGame
      },
      {
        id: 'colorMixer',
        name: 'Maka',
        subtitle: 'Color Mixer',
        portal: 'workshop', // Maka is Workshop
        icon: 'palette',
        category: 'brain',
        desc: 'Drop paint and mix colors by hand in a satisfying open space!',
        constructorRef: ColorMixerGame
      },
      {
        id: 'bugCatcher',
        name: 'Nuko',
        subtitle: 'Bug Catcher',
        portal: 'workshop',
        icon: 'bug',
        category: 'action',
        desc: 'Find all the hidden bugs in the garden!',
        constructorRef: BugCatcherGame
      },
      {
        id: 'soundMemory',
        name: 'Sound Memory',
        subtitle: 'Pattern Recognition',
        portal: 'workshop',
        icon: 'music',
        category: 'brain',
        desc: 'Repeat the pattern of musical tones played by the game!',
        constructorRef: SoundMemoryGame
      },
      {
        id: 'marblePipe',
        name: 'Marble Pipe',
        subtitle: 'Logic Puzzle',
        portal: 'lab',
        icon: 'pipe',
        category: 'brain',
        desc: 'Build your own physics marble run with ramps, boosters, and bumpers!',
        constructorRef: MarblePipeGame
      },
      {
        id: 'soundBoard',
        name: 'Sound Board',
        subtitle: 'Audio Patterns',
        portal: 'sandbox',
        icon: 'sound',
        category: 'sensory',
        desc: 'Tap color pads to trigger different instruments and tones!',
        constructorRef: SoundBoardGame
      },
      {
        id: 'particlePhysics',
        name: 'Particle Play',
        subtitle: 'Physics Sandbox',
        portal: 'sandbox',
        icon: 'particle',
        category: 'action',
        desc: 'Draw particle fields and watch gravity and physics react to your touch!',
        constructorRef: ParticlePhysicsGame
      },
      {
        id: 'switchboard',
        name: 'The Switchboard',
        subtitle: 'Toggles & Swaps',
        portal: 'busyBoard',
        icon: 'settings',
        category: 'sensory',
        desc: 'Explore toggles, dials, breakers, and switches with rich sounds and haptic responses!',
        constructorRef: SwitchboardGame
      },
      {
        id: 'luminaryBoard',
        name: 'The Luminary Board',
        subtitle: 'Dimmers & Color Matrices',
        portal: 'busyBoard',
        icon: 'bulb',
        category: 'sensory',
        desc: 'Interact with dimmers, strobe patterns, halos, and multi-finger color gradients!',
        constructorRef: LuminaryBoardGame
      },
      {
        id: 'mechanicalWorkshop',
        name: 'The Mechanical Workshop',
        subtitle: 'Latches, Links, & Gears',
        portal: 'busyBoard',
        icon: 'settings', // Reusing settings icon
        category: 'sensory',
        desc: 'Spin interlocking gears, plug stereo cords, drag latches, and twist combination tumblers!',
        constructorRef: MechanicalWorkshopGame
      },
      {
        id: 'cloudShape',
        name: 'Cloud Shape Finder',
        subtitle: 'Procedural Sky & Animals',
        portal: 'sandbox',
        icon: 'cloud',
        category: 'sensory',
        desc: 'Tap and trace soft puffy clouds to morph them into cute animal outlines!',
        constructorRef: CloudShapeGame
      },
      {
        id: 'liteBrite',
        name: 'Digital Lite Brite',
        subtitle: 'Glowing Peg Matrix',
        portal: 'workshop',
        icon: 'sparkles',
        category: 'sensory',
        desc: 'Trace templates and design glowing neon art with colorful acrylic pegs!',
        constructorRef: LiteBriteGame
      },
      {
        id: 'animalChoir',
        name: 'Animal Choir',
        subtitle: 'Rhythm Grid Sequencer',
        portal: 'workshop',
        icon: 'music',
        category: 'brain',
        desc: 'Create rhythmic songs with a grid of singing animal cards!',
        constructorRef: AnimalChoirGame
      },
      {
        id: 'equationTower',
        name: 'Equation Tower',
        subtitle: 'Physics Math Balance',
        portal: 'lab',
        icon: 'layers',
        category: 'brain',
        desc: 'Stack physics blocks on a balance scale to hit target sum goals without tumbling!',
        constructorRef: EquationTowerGame
      },
      {
        id: 'vibeCoder',
        name: 'Vibe Coder',
        subtitle: 'Visual Logic Pathfinding',
        portal: 'lab',
        icon: 'code',
        category: 'brain',
        desc: 'Queue step arrows to guide your character through mazes to collect treats!',
        constructorRef: VibeCoderGame
      },
      {
        id: 'trashSorcerer',
        name: 'Trash Sorcerer',
        subtitle: 'Physics Flick Sorting',
        portal: 'lab',
        icon: 'trash',
        category: 'action',
        desc: 'Flick items into magic recycling, compost, and trash portals!',
        constructorRef: TrashSorcererGame
      },
      {
        id: 'khipuSynth',
        name: 'Khipu Synth',
        subtitle: '8-Track Loop & Music Studio',
        portal: 'lab',
        icon: 'sliders',
        category: 'brain',
        desc: 'Build 8-track loop sequences, customize instruments and BPM, and record audio!',
        constructorRef: KhipuSynthGame
      },
      {
        id: 'soundWaveStudio',
        name: 'Sound & Wave Studio',
        subtitle: 'Acoustic Mechanics',
        portal: 'busyBoard',
        icon: 'activity',
        category: 'sensory',
        desc: 'Explore pitch ribbons, siren handles, formant shifters, morse keys, and plungers!',
        constructorRef: SoundWaveStudioGame
      },
      {
        id: 'typographyBoard',
        name: 'Typography & Interface',
        subtitle: 'Tactile Text Controls',
        portal: 'busyBoard',
        icon: 'type',
        category: 'sensory',
        desc: 'Interact with odometer tumblers, font weight sliders, word gravity, and case toggles!',
        constructorRef: TypographyBoardGame
      }
    ];

    list.forEach(game => this.registry.set(game.id, game));
  }

  public get(id: string): GameRegistration | undefined {
    return this.registry.get(id);
  }

  public getAll(): GameRegistration[] {
    return Array.from(this.registry.values());
  }

  public getIds(): string[] {
    return Array.from(this.registry.keys());
  }

  public getByPortal(portal: 'sandbox' | 'workshop' | 'lab' | 'busyBoard'): GameRegistration[] {
    return this.getAll().filter(game => game.portal === portal);
  }

  public getByCategory(category: 'sensory' | 'brain' | 'action'): GameRegistration[] {
    return this.getAll().filter(game => game.category === category);
  }
}
