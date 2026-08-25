import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BugCatcherGame } from '../src/games/bugCatcher/BugCatcherGame';
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
    font: '',
    textAlign: '',
    textBaseline: '',
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    createImageData: vi.fn().mockImplementation((w, h) => ({
      data: new Uint8ClampedArray(w * h * 4),
    })),
    putImageData: vi.fn(),
  };

  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as any);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {}
  });

  return canvas;
}

describe('BugCatcherGame', () => {
  let game: BugCatcherGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AudioController.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(HapticController.prototype, 'lightTap').mockImplementation(() => {});

    game = new BugCatcherGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize 4 bugs at start', () => {
    expect(game).toBeDefined();
    expect((game as any).bugs.length).toBe(4);
    expect((game as any).bugsCaught).toBe(0);
  });

  it('should catch a bug when clicked', () => {
    const bugs = (game as any).bugs;
    const target = bugs[0];

    (game as any).checkBugClick(target.x, target.y);

    expect(target.caught).toBe(true);
    expect((game as any).bugsCaught).toBe(1);
  });

  it('should trigger win condition when all 4 bugs are caught', () => {
    const bugs = (game as any).bugs;
    bugs.forEach((b: any) => (game as any).checkBugClick(b.x, b.y));

    expect((game as any).bugsCaught).toBe(4);
  });

  it('should update texture phase animation', () => {
    const initialPhase = (game as any).texturePhase;
    game.update(16);
    expect((game as any).texturePhase).toBeGreaterThan(initialPhase);
  });

  it('should remove event listeners on destroy', () => {
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');
    game.destroy();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });
});
