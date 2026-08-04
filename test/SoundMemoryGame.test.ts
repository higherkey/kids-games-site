import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SoundMemoryGame } from '../src/games/soundMemory/SoundMemoryGame';
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
    font: '',
    textAlign: '',
    textBaseline: '',
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  };

  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as any);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {}
  });

  return canvas;
}

describe('SoundMemoryGame', () => {
  let game: SoundMemoryGame;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(AudioController.prototype, 'play').mockImplementation(() => {});
    vi.spyOn(HapticController.prototype, 'lightTap').mockImplementation(() => {});

    game = new SoundMemoryGame();
    canvas = createMockCanvas();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
    vi.useRealTimers();
  });

  it('should initialize 4 sound buttons and start at level 1', () => {
    expect(game).toBeDefined();
    expect((game as any).buttons.length).toBe(4);
    expect((game as any).level).toBe(1);
    expect((game as any).sequence.length).toBe(1);
  });

  it('should transition to play phase after sequence playback', () => {
    game.update(16);
    expect((game as any).phase).toBe('wait');

    vi.advanceTimersByTime(2000);
    expect((game as any).phase).toBe('play');
  });

  it('should advance to next round when player matches sequence', () => {
    (game as any).phase = 'play';
    const expectedTarget = (game as any).sequence[0];
    const button = (game as any).buttons[expectedTarget];

    (game as any).handleButtonPress(button.x, button.y);
    vi.advanceTimersByTime(200);

    expect((game as any).phase).toBe('won');
  });

  it('should handle wrong button press and lose game', () => {
    (game as any).phase = 'play';
    const correctTarget = (game as any).sequence[0];
    const wrongTarget = (correctTarget + 1) % 4;
    const button = (game as any).buttons[wrongTarget];

    (game as any).handleButtonPress(button.x, button.y);
    vi.advanceTimersByTime(200);

    expect((game as any).phase).toBe('lost');
  });

  it('should clear active timeouts on destroy', () => {
    game.destroy();
    expect((game as any).activeTimeouts.length).toBe(0);
  });
});
