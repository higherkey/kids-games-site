import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KhipuSynthGame } from '../src/games/khipuSynth/KhipuSynthGame';
import { HapticController } from '../src/core/HapticController';

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

describe('KhipuSynthGame', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;
  let game: KhipuSynthGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vibrateMock = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    (HapticController as any).instance = undefined;

    // Mock Web Audio Context
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
            value: 1,
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
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
      createAnalyser() {
        return {
          fftSize: 64,
          frequencyBinCount: 32,
          getByteFrequencyData: vi.fn(),
          connect: vi.fn(),
        };
      }
      createMediaStreamDestination() {
        return {
          stream: {},
        };
      }
    } as any;

    (globalThis as any).MediaRecorder = class MockMediaRecorder {
      state = 'inactive';
      static isTypeSupported() { return true; }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }
      ondataavailable: any;
      onstop: any;
    } as any;

    game = new KhipuSynthGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
  });

  it('should initialize without errors', () => {
    expect(game).toBeDefined();
  });

  it('should render game and update playhead over time', () => {
    expect(() => game.update(100)).not.toThrow();
    expect(() => game.update(200)).not.toThrow();
  });

  it('should support sound setting toggles', () => {
    expect(() => game.setSoundEnabled(false)).not.toThrow();
    expect(() => game.setSoundEnabled(true)).not.toThrow();
  });

  it('should handle canvas resizing', () => {
    expect(() => game.resize?.(500, 1000)).not.toThrow();
  });

  it('should pause and resume without errors', () => {
    game.pause();
    expect(() => game.update(16)).not.toThrow();

    game.resume();
    expect(() => game.update(16)).not.toThrow();
  });

  it('should toggle recording mode', () => {
    expect(() => game.toggleRecording()).not.toThrow();
    expect(() => game.toggleRecording()).not.toThrow();
  });

  it('should support clearing patterns', () => {
    expect(() => game.clearPattern()).not.toThrow();
  });

  it('should trigger performance pads', () => {
    const pad = (game as any).performancePads[0];
    expect(pad).toBeDefined();
    game.triggerPad(pad);
    expect(vibrateMock).toHaveBeenCalled();
  });
});
