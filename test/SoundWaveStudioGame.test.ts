import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SoundWaveStudioGame } from '../src/games/busyBoard/SoundWaveStudioGame';
import { AudioController } from '../src/core/AudioController';

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
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
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    measureText: vi.fn(() => ({ width: 50 })),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
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

describe('SoundWaveStudioGame (Board 4)', () => {
  let game: SoundWaveStudioGame;
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

    game = new SoundWaveStudioGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize game board cleanly', () => {
    expect(game).toBeDefined();
  });

  it('should update and render without errors', () => {
    expect(() => {
      game.update(16);
      game.render();
    }).not.toThrow();
  });

  it('should trigger screen shake cleanly', () => {
    expect(() => {
      game.triggerShake(300, 15);
      game.update(16);
      game.render();
    }).not.toThrow();
  });

  it('should handle pointer interactions across modules', () => {
    const downEvent = new MouseEvent('mousedown', { clientX: 50, clientY: 50 });
    canvas.dispatchEvent(downEvent);

    const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 50 });
    canvas.dispatchEvent(moveEvent);

    const upEvent = new MouseEvent('mouseup');
    canvas.dispatchEvent(upEvent);

    expect(() => game.render()).not.toThrow();
  });

  it('should support resize operations', () => {
    expect(() => {
      game.resize(1200, 800);
      game.render();
    }).not.toThrow();
  });
});
