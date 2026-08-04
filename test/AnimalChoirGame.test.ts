import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnimalChoirGame } from '../src/games/animalChoir/AnimalChoirGame';
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

describe('AnimalChoirGame', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;
  let game: AnimalChoirGame;
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
      createBiquadFilter() {
        return {
          type: 'lowpass',
          Q: { value: 1 },
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
    } as any;

    game = new AnimalChoirGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize 4x4 grid sequencer with animals', () => {
    expect(game).toBeDefined();
    expect(game.cols).toBe(4);
    expect(game.rows).toBe(4);
    expect(game.animals.length).toBe(8);

    const grid = game.getGrid();
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(4);
  });

  it('should toggle animal active state and trigger vocal synth on tap', () => {
    const grid = game.getGrid();
    const initialActive = grid[0][0].active;

    // Simulate click on first card (grid area)
    const event = new MouseEvent('mousedown', {
      clientX: 50,
      clientY: 100,
    });
    canvas.dispatchEvent(event);

    expect(grid[0][0].active).toBe(!initialActive);
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('should configure BPM within bounds 60-180', () => {
    game.setBpm(150);
    expect(game.bpm).toBe(150);

    game.setBpm(200);
    expect(game.bpm).toBe(180);

    game.setBpm(40);
    expect(game.bpm).toBe(60);
  });

  it('should sweep playhead and update without throwing', () => {
    expect(() => game.update(100)).not.toThrow();
    expect(() => game.update(500)).not.toThrow();
  });

  it('should pause and resume sequencer', () => {
    game.pause();
    expect(() => game.update(100)).not.toThrow();

    game.resume();
    expect(() => game.update(100)).not.toThrow();
  });
});
