import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameUI } from '../src/ui/GameUI';

describe('GameUI', () => {
  let ui: GameUI;
  let onHome: () => void;
  let onPause: () => void;
  let onResume: () => void;
  let onRestart: () => void;
  let onSoundToggle: (enabled: boolean) => void;
  let onVibrationToggle: (enabled: boolean) => void;

  beforeEach(() => {
    onHome = vi.fn();
    onPause = vi.fn();
    onResume = vi.fn();
    onRestart = vi.fn();
    onSoundToggle = vi.fn();
    onVibrationToggle = vi.fn();

    document.body.innerHTML = '';

    ui = new GameUI({
      gameName: 'Test Game',
      portalId: 'workshop',
      portalName: 'Workshop',
      onPortalBack: vi.fn(),
      onHome,
      onPause,
      onResume,
      onRestart,
      soundEnabled: true,
      vibrationEnabled: true,
      onSoundToggle,
      onVibrationToggle,
    });
    ui.mount();
  });

  it('should mount HUD header and slide menu', () => {
    expect(document.getElementById('game-header')).not.toBeNull();
    expect(document.getElementById('slide-menu')).not.toBeNull();
  });

  it('should toggle slide menu open and closed', () => {
    const slideMenu = document.getElementById('slide-menu');
    expect(slideMenu?.classList.contains('open')).toBe(false);

    ui.toggleMenu();
    expect(slideMenu?.classList.contains('open')).toBe(true);

    ui.toggleMenu();
    expect(slideMenu?.classList.contains('open')).toBe(false);
  });

  it('should trigger pause and resume methods', () => {
    ui.pause();
    expect(onPause).toHaveBeenCalled();

    ui.resume();
    expect(onResume).toHaveBeenCalled();
  });

  it('should unmount cleanly', () => {
    ui.unmount();
    expect(document.getElementById('game-header')).toBeNull();
    expect(document.getElementById('slide-menu')).toBeNull();
  });
});
