import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BalloonPopGame } from '../src/games/balloonPop/BalloonPopGame';
import { AudioController } from '../src/core/AudioController';
import { HapticController } from '../src/core/HapticController';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const ctx: Record<string, any> = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
  };

  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as any);
  return canvas;
}

describe('BalloonPopGame', () => {
  let game: BalloonPopGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AudioController.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(HapticController.prototype, 'lightTap').mockImplementation(() => {});
    vi.spyOn(HapticController.prototype, 'heavyImpact').mockImplementation(() => {});

    game = new BalloonPopGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize game state cleanly', () => {
    expect(game).toBeDefined();
    expect((game as any).balloons.length).toBe(0);
    expect((game as any).popsCount).toBe(0);
  });

  it('should spawn balloons on update cycle', () => {
    game.update(1600); // Exceeds initial 1500ms spawn interval
    expect((game as any).balloons.length).toBeGreaterThan(0);
  });

  it('should handle popping a balloon on touch/mouse hit', () => {
    // Manually add a balloon for testing
    (game as any).balloons = [
      { x: 100, y: 100, radius: 40, color: '#FF5E5E', pattern: 'none', hits: 0, maxHits: 1, velocity: 2 }
    ];

    // Trigger click on balloon
    (game as any).checkPop(100, 100);

    expect((game as any).popsCount).toBe(1);
    expect((game as any).balloons.length).toBe(0);
  });

  it('should handle multi-hit balloons correctly before popping', () => {
    (game as any).balloons = [
      { x: 200, y: 200, radius: 40, color: '#FFE66D', pattern: 'dots', hits: 0, maxHits: 2, velocity: 2 }
    ];

    // First hit
    (game as any).checkPop(200, 200);
    expect((game as any).balloons.length).toBe(1);
    expect((game as any).balloons[0].hits).toBe(1);

    // Second hit -> pops balloon
    (game as any).checkPop(200, 200);
    expect((game as any).balloons.length).toBe(0);
    expect((game as any).popsCount).toBe(1);
  });

  it('should remove event listeners on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.destroy();
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
  });
});
