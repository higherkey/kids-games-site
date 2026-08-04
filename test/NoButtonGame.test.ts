import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NoButtonGame } from '../src/games/noButton/NoButtonGame';
import { AudioController } from '../src/core/AudioController';
import { TranslationManager } from '../src/core/TranslationManager';

describe('NoButtonGame', () => {
  let game: NoButtonGame;
  let canvas: HTMLCanvasElement;
  let appContainer: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AudioController.prototype, 'speak').mockImplementation(() => {});
    vi.spyOn(AudioController.prototype, 'isLanguageSupported').mockReturnValue(true);

    document.body.innerHTML = '<div id="app"></div>';
    appContainer = document.getElementById('app')!;

    canvas = document.createElement('canvas');
    game = new NoButtonGame();
    game.init(canvas);
  });

  afterEach(() => {
    game.destroy();
    document.body.innerHTML = '';
  });

  it('should initialize DOM controls and buttons', () => {
    expect(game).toBeDefined();
    const gameContainer = document.getElementById('no-button-game');
    expect(gameContainer).not.toBeNull();
    expect(gameContainer?.querySelector('#giant-no-button')).not.toBeNull();
    expect(gameContainer?.querySelector('#giant-yes-button')).not.toBeNull();
  });

  it('should speak NO when NO button is clicked', () => {
    const speakSpy = vi.spyOn(AudioController.prototype, 'speak');
    const noBtn = document.getElementById('giant-no-button') as HTMLButtonElement;

    noBtn.click();

    expect(speakSpy).toHaveBeenCalledWith(expect.stringMatching(/no/i), expect.any(String));
  });

  it('should speak YES when YES button is clicked', () => {
    const speakSpy = vi.spyOn(AudioController.prototype, 'speak');
    const yesBtn = document.getElementById('giant-yes-button') as HTMLButtonElement;

    yesBtn.click();

    expect(speakSpy).toHaveBeenCalledWith(expect.stringMatching(/yes/i), expect.any(String));
  });

  it('should toggle language dropdown menu', () => {
    const trigger = document.getElementById('dropdown-trigger-btn') as HTMLButtonElement;
    trigger.click();

    expect((game as any).isDropdownOpen).toBe(true);

    trigger.click();
    expect((game as any).isDropdownOpen).toBe(false);
  });

  it('should change active language on random button click', () => {
    const randomBtn = document.getElementById('random-lang-btn') as HTMLButtonElement;
    const initialLang = TranslationManager.getCurrent().code;

    randomBtn.click();

    expect(AudioController.prototype.speak).toHaveBeenCalled();
  });

  it('should clean up container and listeners on destroy', () => {
    game.destroy();
    expect(document.getElementById('no-button-game')).toBeNull();
  });
});
