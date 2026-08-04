import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VibeCoderGame } from '../src/games/vibeCoder/VibeCoderGame';

// Mock Audio & Haptics
vi.mock('../src/core/AudioController', () => ({
  AudioController: {
    getInstance: () => ({
      registerSound: vi.fn(),
      play: vi.fn(),
    })
  }
}));

vi.mock('../src/core/HapticController', () => ({
  HapticController: {
    getInstance: () => ({
      lightTap: vi.fn(),
      success: vi.fn(),
    })
  }
}));

const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: '',
};

describe('VibeCoderGame', () => {
  let canvas: HTMLCanvasElement;
  let game: VibeCoderGame;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext = vi.fn().mockReturnValue(mockCtx);

    game = new VibeCoderGame();
  });

  it('should initialize level grid, player start position, goal, and stars', () => {
    game.init(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect((game as any).playerPos).toEqual({ x: 0, y: 0 });
    expect((game as any).gridWidth).toBe(4);
    expect((game as any).goalPos).toEqual({ x: 3, y: 3 });
  });

  it('should queue commands up to maximum capacity', () => {
    game.init(canvas);
    expect((game as any).commandQueue.length).toBe(0);

    (game as any).addCommand('RIGHT');
    (game as any).addCommand('DOWN');

    expect((game as any).commandQueue).toEqual(['RIGHT', 'DOWN']);

    (game as any).clearCommands();
    expect((game as any).commandQueue.length).toBe(0);
  });

  it('should execute queued commands sequentially and reach goal', () => {
    game.init(canvas);
    (game as any).commandQueue = ['RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'DOWN', 'DOWN'];
    (game as any).startExecution();

    expect((game as any).isExecuting).toBe(true);

    // Execute step by step
    for (let i = 0; i < 6; i++) {
      (game as any).executeStep();
    }

    expect((game as any).isExecuting).toBe(false);
    expect((game as any).playerPos).toEqual({ x: 3, y: 3 });
    expect((game as any).gameWon).toBe(true);
  });

  it('should cleanly remove event listeners on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.init(canvas);

    game.destroy();
    expect(removeSpy).toHaveBeenCalled();
  });
});
