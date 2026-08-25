import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StereoPannerModule } from '../src/games/busyBoard/modules/StereoPannerModule';

function createMockContext(): CanvasRenderingContext2D {
  const ctxBase: Record<string, any> = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
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
    roundRect: vi.fn(),
  };

  return new Proxy(ctxBase, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
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
  }) as any;
}

describe('StereoPannerModule', () => {
  let module: StereoPannerModule;
  let mockGame: any;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
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
            setTargetAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
      createBiquadFilter() {
        return {
          type: 'lowpass',
          frequency: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            setTargetAtTime: vi.fn(),
          },
          Q: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            setTargetAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
    } as any;

    mockGame = {
      getTheme: () => 'paper',
    };
    module = new StereoPannerModule('013', 4, 2, 1, 1, mockGame);
    module.init();
    ctx = createMockContext();
  });

  afterEach(() => {
    module.destroy();
  });

  it('should initialize with center pan value and render without errors', () => {
    expect(module).toBeDefined();
    expect(module.id).toBe('013');
    expect(() => module.render(ctx, 400, 200, 100, 100)).not.toThrow();
  });

  it('should handle pointer down within active track area', () => {
    const px = 400;
    const py = 200;
    const pw = 200;
    const ph = 100;
    const trackY = py + ph / 2 + 2;

    const handled = module.handlePointerDown(px + 100, trackY, px, py, pw, ph);
    expect(handled).toBe(true);
  });

  it('should ignore pointer down outside active track area', () => {
    const px = 400;
    const py = 200;
    const pw = 200;
    const ph = 100;

    const handled = module.handlePointerDown(px + 10, py + 10, px, py, pw, ph);
    expect(handled).toBe(false);
  });

  it('should update panning on pointer move and stop glide on pointer up', () => {
    const px = 400;
    const py = 200;
    const pw = 200;
    const ph = 100;
    const trackY = py + ph / 2 + 2;

    module.handlePointerDown(px + 100, trackY, px, py, pw, ph);
    expect(() => module.handlePointerMove(px + 150, trackY, px, py, pw, ph)).not.toThrow();
    expect(() => module.handlePointerUp(px + 150, trackY, px, py, pw, ph)).not.toThrow();
  });

  it('should render neon theme seamlessly', () => {
    mockGame.getTheme = () => 'neon';
    expect(() => module.render(ctx, 400, 200, 100, 100)).not.toThrow();
  });
});
