import { BaseBusyBoardGame } from './BaseBusyBoardGame';
import { BoardModuleRegistry } from './BoardModuleRegistry';
import { AudioController } from '../../core/AudioController';
import type { IAudioEngine } from '../../core/IAudioEngine';

export type LuminaryTheme = 'paper' | 'neon';

export class LuminaryBoardGame extends BaseBusyBoardGame {
  // Luminary states
  private theme: LuminaryTheme = 'paper';
  private rgb = { r: 0, g: 0, b: 0 };

  public override init(canvas: HTMLCanvasElement): void {
    // Register click/ticking sounds if needed
    const audio = AudioController.getInstance();
    audio.registerSound('busyboard:toggle_on', '/sounds/busyBoard/toggle_on.wav');
    audio.registerSound('busyboard:toggle_off', '/sounds/busyBoard/toggle_off.wav');
    audio.registerSound('busyboard:dip', '/sounds/busyBoard/dip.wav');
    audio.registerSound('busyboard:key_turn', '/sounds/busyBoard/key_turn.wav');
    audio.registerSound('busyboard:push_button', '/sounds/busyBoard/push_button.wav');

    this.cols = 5; // Luminary board has 5 columns
    super.init(canvas);
  }

  protected override setupModules() {
    this.modules = [];

    // Board 2 Layout: [col, row, width, height]
    const layouts = [
      { id: '011', col: 0, row: 0, w: 1, h: 1 }, // RotaryDimmer
      { id: '015', col: 0, row: 1, w: 1, h: 1 }, // RainbowCrossfader
      { id: '018', col: 0, row: 2, w: 1, h: 1 }, // HaloExpander

      { id: '012', col: 1, row: 0, w: 2, h: 2 }, // Unified RGBLightModule (replaces sliders & RGBCanvasBlock)
      { id: '017', col: 1, row: 2, w: 2, h: 1 }, // StrobeFrequency (spans columns 1 and 2 under the light module)

      { id: '016', col: 3, row: 0, w: 1, h: 2 }, // ShadowProjection (Double height)
      { id: '019', col: 3, row: 2, w: 1, h: 1 }, // ContrastInverter

      { id: '020', col: 4, row: 0, w: 1, h: 2 }, // DualFingerGradient (Double height)
      { id: '013', col: 4, row: 2, w: 1, h: 1 }, // StereoPannerModule
    ];

    layouts.forEach(layout => {
      const Constructor = BoardModuleRegistry[layout.id];
      if (!Constructor) {
        console.warn(`Module constructor for ID ${layout.id} not found.`);
        return;
      }

      const instance = new Constructor(
        layout.id,
        layout.col,
        layout.row,
        layout.w,
        layout.h,
        this // Pass 'this' as the parent controller game
      );
      instance.init();
      this.modules.push(instance);
    });
  }

  public getAudioController(): IAudioEngine {
    return AudioController.getInstance();
  }

  public getTheme(): LuminaryTheme {
    return this.theme;
  }

  public setTheme(newTheme: LuminaryTheme) {
    this.theme = newTheme;
  }

  public getRGB(): Readonly<{ r: number; g: number; b: number }> {
    // Return a shallow copy so callers cannot mutate game state directly.
    return { ...this.rgb };
  }

  public updateRGB(channel: 'r' | 'g' | 'b', val: number) {
    // Clamp and round at the model boundary to guarantee valid 0-255 integers.
    this.rgb[channel] = Math.max(0, Math.min(255, Math.round(val)));
  }

  public override update(_dt: number): void {
    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply horizontal translation for scrolling
    this.ctx.save();
    this.ctx.translate(-this.scrollX, 0);

    const boardWidth = this.cols * this.cellW;

    // Draw main background color based on active theme
    if (this.theme === 'paper') {
      this.ctx.fillStyle = '#FAF4E8'; // Warm parchment
    } else {
      this.ctx.fillStyle = '#0C0E14'; // Cyber dark
    }
    this.ctx.fillRect(0, 0, boardWidth, this.canvas.height);

    // Draw gorgeous glowing background auris/halo representing active RGB color mix
    const mixR = this.rgb.r;
    const mixG = this.rgb.g;
    const mixB = this.rgb.b;

    this.ctx.save();
    // Ambient radial glow behind modules
    const radGlow = this.ctx.createRadialGradient(
      boardWidth / 2, this.canvas.height / 2, 50,
      boardWidth / 2, this.canvas.height / 2, boardWidth * 0.4
    );
    radGlow.addColorStop(0, `rgba(${mixR}, ${mixG}, ${mixB}, ${this.theme === 'paper' ? 0.08 : 0.18})`);
    radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = radGlow;
    this.ctx.fillRect(0, 0, boardWidth, this.canvas.height);
    this.ctx.restore();

    // Draw module grid dividing lines (skipping boundaries inside multi-cell modules)
    const gridColor = this.theme === 'paper' ? '#E3D7C1' : '#1D2530';
    this.drawGridLines(gridColor, 4);

    // Render modules
    this.modules.forEach(mod => {
      const box = this.getModuleRenderBox(mod);
      mod.render(this.ctx!, box.x, box.y, box.w, box.h);
    });

    this.ctx.restore(); // Restore scroll translation

    // Draw visual hints if the board can scroll
    this.drawScrollIndicators();
  }

  protected override getScrollArrowColor(): string {
    return this.theme === 'paper' ? 'rgba(90, 86, 76, 0.4)' : 'rgba(0, 255, 204, 0.4)';
  }
}
