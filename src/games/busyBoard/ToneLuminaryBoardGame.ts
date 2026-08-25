import { BaseBusyBoardGame } from './BaseBusyBoardGame';
import { BoardModuleRegistry } from './BoardModuleRegistry';
import { ToneAudioController } from '../../core/ToneAudioController';
import type { IAudioEngine } from '../../core/IAudioEngine';

export type LuminaryTheme = 'paper' | 'neon';

export class ToneLuminaryBoardGame extends BaseBusyBoardGame {
  private theme: LuminaryTheme = 'paper';
  private rgb = { r: 0, g: 0, b: 0 };
  private toneAudio = ToneAudioController.getInstance();

  public getAudioController(): IAudioEngine {
    return this.toneAudio;
  }

  public override init(canvas: HTMLCanvasElement): void {
    this.cols = 5;
    super.init(canvas);
  }

  protected override setupModules() {
    this.modules = [];

    const layouts = [
      { id: '011', col: 0, row: 0, w: 1, h: 1 }, // RotaryDimmer
      { id: '015', col: 0, row: 1, w: 1, h: 1 }, // RainbowCrossfader
      { id: '018', col: 0, row: 2, w: 1, h: 1 }, // HaloExpander

      { id: '012', col: 1, row: 0, w: 2, h: 2 }, // Unified RGBLightModule
      { id: '017', col: 1, row: 2, w: 2, h: 1 }, // StrobeFrequency

      { id: '016', col: 3, row: 0, w: 1, h: 2 }, // ShadowProjection
      { id: '019', col: 3, row: 2, w: 1, h: 1 }, // ContrastInverter

      { id: '020', col: 4, row: 0, w: 1, h: 2 }, // DualFingerGradient
      { id: '013', col: 4, row: 2, w: 1, h: 1 }, // StereoPannerModule
    ];

    layouts.forEach(layout => {
      const Constructor = BoardModuleRegistry[layout.id];
      if (!Constructor) return;

      const instance = new Constructor(
        layout.id,
        layout.col,
        layout.row,
        layout.w,
        layout.h,
        this
      );
      instance.init();
      this.modules.push(instance);
    });
  }

  public getTheme(): LuminaryTheme {
    return this.theme;
  }

  public setTheme(newTheme: LuminaryTheme) {
    this.theme = newTheme;
  }

  public getRGB(): Readonly<{ r: number; g: number; b: number }> {
    return { ...this.rgb };
  }

  public updateRGB(channel: 'r' | 'g' | 'b', val: number) {
    this.rgb[channel] = Math.max(0, Math.min(255, Math.round(val)));
  }

  public override update(_dt: number): void {
    this.render();
  }

  private render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(-this.scrollX, 0);

    const boardWidth = this.cols * this.cellW;

    if (this.theme === 'paper') {
      this.ctx.fillStyle = '#FAF4E8';
    } else {
      this.ctx.fillStyle = '#0C0E14';
    }
    this.ctx.fillRect(0, 0, boardWidth, this.canvas.height);

    const mixR = this.rgb.r;
    const mixG = this.rgb.g;
    const mixB = this.rgb.b;

    this.ctx.save();
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

    this.modules.forEach(mod => {
      const box = this.getModuleRenderBox(mod);
      mod.render(this.ctx!, box.x, box.y, box.w, box.h);
    });

    this.ctx.restore();
    this.drawScrollIndicators();
  }

  protected override getScrollArrowColor(): string {
    return this.theme === 'paper' ? 'rgba(90, 86, 76, 0.4)' : 'rgba(0, 255, 204, 0.4)';
  }
}
