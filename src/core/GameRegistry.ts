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
import { ToneLuminaryBoardGame } from '../games/busyBoard/ToneLuminaryBoardGame';
import { MechanicalWorkshopGame } from '../games/busyBoard/MechanicalWorkshopGame';

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
  private readonly registry: Map<string, GameRegistration> = new Map();

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
        subtitle: 'Dimmers & Color Matrices (Web Audio)',
        portal: 'busyBoard',
        icon: 'bulb',
        category: 'sensory',
        desc: 'Interact with dimmers, strobe patterns, halos, and multi-finger color gradients with Web Audio glissando!',
        constructorRef: LuminaryBoardGame
      },
      {
        id: 'luminaryBoardTone',
        name: 'The Luminary Board (Tone.js)',
        subtitle: 'Tone.js Synthesizer Studio',
        portal: 'busyBoard',
        icon: 'bulb',
        category: 'sensory',
        desc: 'Compare Tone.js FM synthesis, AM modulation, and continuous pitch-glide voice engine side-by-side!',
        constructorRef: ToneLuminaryBoardGame
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
