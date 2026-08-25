import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrashSorcererGame } from '../src/games/trashSorcerer/TrashSorcererGame';
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

describe('TrashSorcererGame', () => {
  let canvas: HTMLCanvasElement;
  let game: TrashSorcererGame;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext = vi.fn().mockReturnValue(mockCtx);

    game = new TrashSorcererGame();
  });

  it('should initialize engine, world, portals, and zero score', () => {
    game.init(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect((game as any).engine).not.toBeNull();
    expect((game as any).world).not.toBeNull();
    expect((game as any).portals.length).toBe(3);
    expect((game as any).score).toBe(0);
  });

  it('should spawn trash items with random category into physics world', () => {
    game.init(canvas);
    expect((game as any).trashItems.length).toBe(0);

    (game as any).spawnTrash();
    expect((game as any).trashItems.length).toBe(1);
    expect((game as any).trashItems[0].category).toBeDefined();
  });

  it('should increase score on correct portal entry', () => {
    game.init(canvas);

    const item = {
      id: 1,
      body: { id: 10, position: { x: 200, y: 100 } } as any,
      category: 'RECYCLING' as const,
      name: 'Can',
      icon: '🥫',
      color: '#6BCBFF',
      radius: 28,
    };
    (game as any).trashItems = [item];

    const portal = (game as any).portals.find((p: any) => p.category === 'RECYCLING');
    (game as any).handlePortalEntry(item, portal);

    expect((game as any).score).toBe(10);
    expect((game as any).trashItems.length).toBe(0);
  });

  it('should cleanly remove listeners and clear Matter world on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.init(canvas);

    const world = (game as any).world;
    const clearSpy = vi.spyOn(World, 'clear');

    game.destroy();
    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalledWith(world, false);
  });
});
