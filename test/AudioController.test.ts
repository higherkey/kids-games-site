import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioController } from '../src/core/AudioController';

describe('AudioController', () => {
  let audio: AudioController;

  beforeEach(() => {
    vi.clearAllMocks();
    audio = AudioController.getInstance();
  });

  it('should maintain singleton instance', () => {
    const instance2 = AudioController.getInstance();
    expect(audio).toBe(instance2);
  });

  it('should register and play sound without crashing', () => {
    audio.registerSound('test-pop', '/sounds/pop.ogg');
    expect(() => audio.play('test-pop')).not.toThrow();
  });

  it('should handle TTS speak requests', () => {
    const speakSpy = vi.fn();
    (window as any).speechSynthesis = {
      speak: speakSpy,
      cancel: vi.fn(),
      getVoices: () => [
        { lang: 'en-US', name: 'English Voice' },
        { lang: 'es-ES', name: 'Spanish Voice' },
      ],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (window as any).SpeechSynthesisUtterance = function (this: any, text: string) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
    };

    audio.speak('Hello', 'en-US');
    expect(speakSpy).toHaveBeenCalled();
  });

  it('should verify supported languages against TTS voices', () => {
    (window as any).speechSynthesis = {
      getVoices: () => [{ lang: 'es-ES', name: 'Spanish Voice' }],
    };

    expect(audio.isLanguageSupported('es-ES')).toBe(true);
    expect(audio.isLanguageSupported('fr-FR')).toBe(false);
  });
});
