import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquationTowerGame } from '../src/games/equationTower/EquationTowerGame';
import { World } from 'matter-js';

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
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
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
  globalAlpha: 1.0,
};

describe('EquationTowerGame', () => {
  let canvas: HTMLCanvasElement;
  let game: EquationTowerGame;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext = vi.fn().mockReturnValue(mockCtx);

    game = new EquationTowerGame();
  });

  it('should initialize engine, world, environment, and target equation', () => {
    game.init(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect((game as any).engine).not.toBeNull();
    expect((game as any).world).not.toBeNull();
    expect((game as any).targetSum).toBeGreaterThan(0);
    expect((game as any).paletteBlocks.length).toBe(5);
  });

  it('should spawn blocks into the physics world', () => {
    game.init(canvas);
    expect((game as any).blocks.length).toBe(0);

    const template = (game as any).paletteBlocks[0];
    (game as any).spawnBlock(template, 400, 200);

    expect((game as any).blocks.length).toBe(1);
    expect((game as any).blocks[0].value).toBe(template.value);
  });

  it('should calculate current sum resting on platform', () => {
    game.init(canvas);
    const template = { value: 5, shape: 'square' as const, color: '#FF5E5E' };
    (game as any).spawnBlock(template, 400, 450);

    (game as any).calculateCurrentSum();
    expect((game as any).currentSum).toBe(5);
  });

  it('should trigger win when current sum matches target sum', () => {
    game.init(canvas);
    (game as any).targetSum = 10;
    expect((game as any).gameWon).toBe(false);

    const template = { value: 10, shape: 'square' as const, color: '#FF5E5E' };
    (game as any).spawnBlock(template, 400, 450);

    (game as any).calculateCurrentSum();
    expect((game as any).gameWon).toBe(true);
  });

  it('should cleanly remove event listeners and clear Matter world on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.init(canvas);
    const world = (game as any).world;
    const clearSpy = vi.spyOn(World, 'clear');

    game.destroy();
    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalledWith(world, false);
  });
});
