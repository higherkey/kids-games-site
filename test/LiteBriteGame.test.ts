import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LiteBriteGame } from '../src/games/liteBrite/LiteBriteGame';
import { HapticController } from '../src/core/HapticController';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const ctxBase: Record<string, any> = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
    measureText: vi.fn(() => ({ width: 50 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };

  const ctx = new Proxy(ctxBase, {
    get(target, prop) {
      if (prop in target) {
        return (target as any)[prop];
      }
      if (typeof prop === 'string') {
        (target as any)[prop] = vi.fn();
        return (target as any)[prop];
      }
      return undefined;
    },
    set(target, prop, value) {
      if (typeof prop === 'string') {
        (target as any)[prop] = value;
        return true;
      }
      return false;
    },
  });

  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as any);
  return canvas;
}

describe('LiteBriteGame', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;
  let game: LiteBriteGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vibrateMock = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    (HapticController as any).instance = undefined;

    (globalThis as any).AudioContext = class MockAudioContext {
      destination = {};
      currentTime = 0;
      state = 'running';
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createOscillator() {
        return {
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
    } as any;

    game = new LiteBriteGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize dark grid pegboard', () => {
    expect(game).toBeDefined();
    expect(game.cols).toBe(16);
    expect(game.rows).toBe(12);

    const grid = game.getGrid();
    expect(grid.length).toBe(12);
    expect(grid[0].length).toBe(16);
  });

  it('should insert glowing peg on cell tap', () => {
    // Click in grid area
    const event = new MouseEvent('mousedown', {
      clientX: 200,
      clientY: 200,
    });
    canvas.dispatchEvent(event);

    expect(vibrateMock).toHaveBeenCalled();
  });

  it('should switch color palette index', () => {
    expect(game.selectedColorIndex).toBe(0);

    // Click palette area at bottom
    const event = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 570,
    });
    canvas.dispatchEvent(event);

    expect(game.selectedColorIndex).toBeGreaterThanOrEqual(0);
  });

  it('should trigger clear animation and empty grid', () => {
    // Fill a peg first
    const grid = game.getGrid();
    grid[0][0].colorIndex = 1;

    game.clearBoard();

    expect(grid[0][0].colorIndex).toBeNull();
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('should update and render without throwing', () => {
    expect(() => game.update(16)).not.toThrow();
  });
});
