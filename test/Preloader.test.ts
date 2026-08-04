import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Preloader } from '../src/core/Preloader';

describe('Preloader', () => {
  let originalImage: any;

  beforeEach(() => {
    originalImage = globalThis.Image;
    (globalThis as any).Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => this.onload?.(), 0);
      }
      get src() {
        return this._src;
      }
    };
  });

  afterEach(() => {
    (globalThis as any).Image = originalImage;
    vi.restoreAllMocks();
  });

  it('should load image and audio assets without blocking on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(new Blob(['fake audio']), { status: 200 }))
    );

    const assets = [
      { url: '/images/test.png', type: 'image' as const },
      { url: '/sounds/pop.ogg', type: 'audio' as const },
    ];

    await expect(Preloader.loadAssets(assets)).resolves.toBeUndefined();
  });

  it('should handle fetch errors gracefully for audio assets', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Network failure'))
    );

    const assets = [{ url: '/sounds/missing.ogg', type: 'audio' as const }];
    await expect(Preloader.loadAssets(assets)).resolves.toBeUndefined();
  });
});
