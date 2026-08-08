import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LuminaryBoardGame } from '../src/games/busyBoard/LuminaryBoardGame';
import { AudioController } from '../src/core/AudioController';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 390;
  canvas.height = 844;

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
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
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

describe('LuminaryBoardGame', () => {
  let game: LuminaryBoardGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    (AudioController as any).instance = undefined;

    (globalThis as any).AudioContext = class MockAudioContext {
      destination = {};
      currentTime = 0;
      state = 'running';
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createBuffer() { return {}; }
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

    game = new LuminaryBoardGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize without errors', () => {
    expect(game).toBeDefined();
    expect(game.getTheme()).toBe('paper');
  });

  it('should toggle theme from paper to neon', () => {
    game.setTheme('neon');
    expect(game.getTheme()).toBe('neon');
  });

  it('should update RGB state', () => {
    game.updateRGB('r', 200);
    expect(game.getRGB().r).toBe(200);
  });

  it('should instantiate RGBLightModule (012) in modules list', () => {
    const modules = (game as any).modules;
    const rgbBlock = modules.find((m: any) => m.id === '012');
    expect(rgbBlock).toBeDefined();
    expect(rgbBlock.w).toBe(2);
    expect(rgbBlock.h).toBe(2);
  });

  it('should update and render without errors', () => {
    expect(() => game.update(16)).not.toThrow();
  });

  it('should handle resize layout', () => {
    game.resize(500, 500);
    expect(() => game.update(16)).not.toThrow();
  });

  it('should process pointer down, move, and up', () => {
    const downEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
    canvas.dispatchEvent(downEvent);

    const moveEvent = new MouseEvent('mousemove', { clientX: 120, clientY: 100 });
    canvas.dispatchEvent(moveEvent);

    const upEvent = new MouseEvent('mouseup');
    canvas.dispatchEvent(upEvent);

    expect(() => game.update(16)).not.toThrow();
  });
});
