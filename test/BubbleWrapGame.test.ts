import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BubbleWrapGame } from '../src/games/bubbleWrap/BubbleWrapGame';
import { AudioController } from '../src/core/AudioController';
import { HapticController } from '../src/core/HapticController';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const ctx: Record<string, any> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  };

  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as any);
  return canvas;
}

describe('BubbleWrapGame', () => {
  let game: BubbleWrapGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AudioController.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(HapticController.prototype, 'lightTap').mockImplementation(() => {});

    game = new BubbleWrapGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize bubble grid based on canvas dimensions', () => {
    expect(game).toBeDefined();
    const bubbles = (game as any).bubbles;
    expect(bubbles.length).toBeGreaterThan(0);
    expect(bubbles.every((b: any) => !b.popped)).toBe(true);
  });

  it('should pop a bubble on click hit', () => {
    const bubbles = (game as any).bubbles;
    const target = bubbles[0];

    // Click right inside the bubble radius
    (game as any).checkPop(target.x, target.y);

    expect(target.popped).toBe(true);
  });

  it('should not re-pop an already popped bubble', () => {
    const bubbles = (game as any).bubbles;
    const target = bubbles[0];

    // Pop it first
    (game as any).checkPop(target.x, target.y);
    expect(target.popped).toBe(true);

    const playSpy = vi.spyOn(AudioController.prototype, 'play');
    playSpy.mockClear();

    // Secondary click on popped bubble
    (game as any).checkPop(target.x, target.y);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('should render unpopped and popped bubbles without error', () => {
    game.update(16);
    const bubbles = (game as any).bubbles;
    bubbles[0].popped = true;
    expect(() => game.update(16)).not.toThrow();
  });

  it('should unregister event listeners on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.destroy();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });
});
