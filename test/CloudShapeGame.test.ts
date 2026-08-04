import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CloudShapeGame } from '../src/games/cloudShape/CloudShapeGame';
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

describe('CloudShapeGame', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;
  let game: CloudShapeGame;
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

    game = new CloudShapeGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize with clouds floating in day sky', () => {
    expect(game).toBeDefined();
    expect(game.getSkyMode()).toBe('day');
    expect(game.getClouds().length).toBeGreaterThan(0);
  });

  it('should toggle sky mode from day to sunset', () => {
    game.toggleSky();
    expect(game.getSkyMode()).toBe('sunset');
    game.toggleSky();
    expect(game.getSkyMode()).toBe('day');
  });

  it('should update clouds and render frame without throwing', () => {
    expect(() => game.update(16)).not.toThrow();
  });

  it('should morph cloud when touched and trigger haptics', () => {
    const clouds = game.getClouds();
    expect(clouds.length).toBeGreaterThan(0);

    const firstCloud = clouds[0];
    expect(firstCloud.morphed).toBe(false);

    // Simulate click on cloud coordinates
    const event = new MouseEvent('mousedown', {
      clientX: firstCloud.x,
      clientY: firstCloud.y,
    });
    canvas.dispatchEvent(event);

    expect(firstCloud.morphed).toBe(true);
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('should pause, resume, and clean up properly', () => {
    game.pause();
    expect(() => game.update(16)).not.toThrow();

    game.resume();
    expect(() => game.update(16)).not.toThrow();

    game.destroy();
    expect(game.getClouds().length).toBe(0);
  });
});
