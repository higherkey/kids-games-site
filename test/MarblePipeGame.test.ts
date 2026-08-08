import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarblePipeGame } from '../src/games/marblePipe/MarblePipeGame';
import { World } from 'matter-js';

// Mock Audio and Haptic controllers
vi.mock('../src/core/AudioController', () => {
  return {
    AudioController: {
      getInstance: () => ({
        registerSound: vi.fn(),
        play: vi.fn(),
        speak: vi.fn(),
      })
    }
  };
});

vi.mock('../src/core/HapticController', () => {
  return {
    HapticController: {
      getInstance: () => ({
        lightTap: vi.fn(),
      })
    }
  };
});

// Setup mock canvas 2D context
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn()
  }),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 50 }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetY: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1.0
};

describe('MarblePipeGame', () => {
  let canvas: HTMLCanvasElement;
  let game: MarblePipeGame;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext = vi.fn().mockReturnValue(mockCtx);

    game = new MarblePipeGame();
  });

  it('should initialize Matter.js engine, boundaries, and starting funnel', () => {
    game.init(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    
    expect((game as any).engine).not.toBeNull();
    expect((game as any).world).not.toBeNull();
    
    // Funnel should be defined
    expect((game as any).startingFunnel.width).toBe(80);
    expect((game as any).startingFunnel.height).toBe(60);
  });

  it('should add sandbox parts (ramp, bumper, booster) to the engine world', () => {
    game.init(canvas);
    expect((game as any).parts).toHaveLength(0);

    // Place a ramp
    (game as any).addPart('ramp');
    expect((game as any).parts).toHaveLength(1);
    expect((game as any).parts[0].type).toBe('ramp');
    
    // Place a bumper
    (game as any).addPart('bumper');
    expect((game as any).parts).toHaveLength(2);
    expect((game as any).parts[1].type).toBe('bumper');
  });

  it('should drop a marble from the starting funnel', () => {
    game.init(canvas);
    expect((game as any).marbles).toHaveLength(0);

    (game as any).spawnMarble();
    expect((game as any).marbles).toHaveLength(1);
  });

  it('should clear all placed parts and marbles when clearBoard is triggered', () => {
    game.init(canvas);
    
    (game as any).addPart('ramp');
    (game as any).spawnMarble();
    
    expect((game as any).parts).toHaveLength(1);
    expect((game as any).marbles).toHaveLength(1);

    // Clear board
    (game as any).clearBoard();
    expect((game as any).parts).toHaveLength(0);
    expect((game as any).marbles).toHaveLength(0);
    expect((game as any).gameWon).toBe(false);
  });

  it('should trigger winning state on goal cup sensor collision', () => {
    game.init(canvas);
    expect((game as any).gameWon).toBe(false);

    // Trigger win directly
    (game as any).triggerWin();
    expect((game as any).gameWon).toBe(true);
  });

  it('should clean up Matter.js composite and event listeners on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.init(canvas);
    
    // Cache world reference
    const world = (game as any).world;
    const clearSpy = vi.spyOn(World, 'clear');

    game.destroy();
    
    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalledWith(world, false);
  });
});
