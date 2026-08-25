import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorDropperGame } from '../src/games/colorDropper/ColorDropperGame';
import { TranslationManager } from '../src/core/TranslationManager';

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

describe('ColorDropperGame', () => {
  let canvas: HTMLCanvasElement;
  let game: ColorDropperGame;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock getContext to return our mock context
    canvas.getContext = vi.fn().mockReturnValue(mockCtx);
    
    // Initialize TranslationManager dummy
    TranslationManager.getCurrent = vi.fn().mockReturnValue({ code: 'en-US' });

    game = new ColorDropperGame();
  });

  it('should initialize successfully and create color pots', () => {
    game.init(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    
    const pots = (game as any).pots;
    expect(pots).toHaveLength(3); // Red, Yellow, Blue
    expect(pots[0].labelKey).toBe('red');
    expect(pots[1].labelKey).toBe('yellow');
    expect(pots[2].labelKey).toBe('blue');
  });

  it('should spawn a color blob', () => {
    game.init(canvas);
    expect((game as any).blobs).toHaveLength(0);

    // Spawn a red blob
    (game as any).spawnBlob('red', 100, 200);
    expect((game as any).blobs).toHaveLength(1);
    
    const blob = (game as any).blobs[0];
    expect(blob.colorName).toBe('red');
    expect(blob.components.red).toBe(1);
    expect(blob.components.yellow).toBe(0);
    expect(blob.components.blue).toBe(0);
  });

  it('should merge two primary blobs and announce the blended color name', () => {
    game.init(canvas);
    
    // Spawn red and yellow blobs overlapping
    (game as any).spawnBlob('red', 200, 200);
    (game as any).spawnBlob('yellow', 210, 200);

    expect((game as any).blobs).toHaveLength(2);

    // Run merge check
    (game as any).checkBlobMerges();

    // They should merge into one orange-ish blob (closest to orange)
    expect((game as any).blobs).toHaveLength(1);
    
    const merged = (game as any).blobs[0];
    expect(merged.colorName).toBe('orange');
    expect(merged.components.red).toBe(1);
    expect(merged.components.yellow).toBe(1);
  });

  it('should split a secondary blob back to its primaries with merge cooldowns', () => {
    game.init(canvas);

    // 1. Manually add an orange mixed blob (Red: 1, Yellow: 1)
    const orangeBlob = {
      id: 99,
      x: 300,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 50,
      colorHex: 'rgb(255, 162, 101)',
      colorName: 'orange',
      components: { red: 1, yellow: 1, blue: 0 },
      isDragging: false,
      mergeCooldown: 0
    };
    (game as any).blobs.push(orangeBlob);

    expect((game as any).blobs).toHaveLength(1);

    // 2. Trigger split
    (game as any).trySplitBlob(orangeBlob);

    // Should have removed orange, and added two blobs (red and yellow)
    expect((game as any).blobs).toHaveLength(2);
    
    const colors = (game as any).blobs.map((b: any) => b.colorName).sort();
    expect(colors).toEqual(['red', 'yellow']);

    // Check merge cooldown is set
    (game as any).blobs.forEach((b: any) => {
      expect(b.mergeCooldown).toBe(800);
    });
  });

  it('should enforce entity cap limit and recycle drops', () => {
    game.init(canvas);
    (game as any).ENTITY_LIMIT = 3;

    (game as any).spawnBlob('red', 100, 100);
    (game as any).spawnBlob('yellow', 150, 100);
    (game as any).spawnBlob('blue', 200, 100);
    expect((game as any).blobs).toHaveLength(3);

    // Spawning 4th should pop oldest (red) and stay at limit 3
    (game as any).spawnBlob('red', 250, 100);
    expect((game as any).blobs).toHaveLength(3);

    // First blob (oldest) should have been evicted — remaining blob IDs should start from 2
    const ids = (game as any).blobs.map((b: any) => b.id);
    expect(ids).not.toContain(1); // id=1 was the first red, should have been popped
    expect(ids).toContain(4);    // id=4 is the newly spawned red that triggered eviction
  });

  it('should clean up event listeners on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.init(canvas);
    game.destroy();
    
    expect(removeSpy).toHaveBeenCalled();
  });
});
