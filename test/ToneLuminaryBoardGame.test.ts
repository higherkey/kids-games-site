import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToneLuminaryBoardGame } from '../src/games/busyBoard/ToneLuminaryBoardGame';
import { ToneAudioController } from '../src/core/ToneAudioController';

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

describe('ToneLuminaryBoardGame', () => {
  let game: ToneLuminaryBoardGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    (ToneAudioController as any).instance = undefined;
    game = new ToneLuminaryBoardGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize ToneLuminaryBoardGame cleanly', () => {
    expect(game).toBeDefined();
    expect(game.getTheme()).toBe('paper');
    expect(game.getAudioController()).toBeDefined();
  });

  it('should toggle theme from paper to neon', () => {
    game.setTheme('neon');
    expect(game.getTheme()).toBe('neon');
  });

  it('should update and retrieve RGB values with boundary clamping', () => {
    game.updateRGB('r', 150);
    game.updateRGB('g', 300); // clamped to 255
    game.updateRGB('b', -20); // clamped to 0
    const rgb = game.getRGB();
    expect(rgb.r).toBe(150);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(0);
  });

  it('should include StereoPannerModule registered under 013', () => {
    const modules = (game as any).modules;
    const panner = modules.find((m: any) => m.id === '013');
    expect(panner).toBeDefined();
    expect(panner.w).toBe(1);
    expect(panner.h).toBe(1);
  });

  it('should update and render without throwing errors', () => {
    expect(() => game.update(16)).not.toThrow();
  });

  it('should handle window resize gracefully', () => {
    game.resize(600, 900);
    expect(() => game.update(16)).not.toThrow();
  });
});
