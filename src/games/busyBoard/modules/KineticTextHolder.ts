import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export interface JiggleWord {
  char: string;
  offsetX: number;
  offsetY: number;
}

export class KineticTextHolder implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isHeld = false;
  private words: JiggleWord[] = [];
  private audio: AudioController;
  private haptics: HapticController;

  constructor(id: string, x: number, y: number, w: number, h: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();

    const text = 'LIQUID';
    for (let i = 0; i < text.length; i++) {
      this.words.push({
        char: text[i],
        offsetX: 0,
        offsetY: 0,
      });
    }
  }

  public init(): void {}

  public isJiggling(): boolean {
    return this.isHeld;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Frame
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#F4F1EA';
    ctx.strokeStyle = '#D5C3A6';
    ctx.lineWidth = 3;
    this.roundRect(ctx, mx, my, mw, mh, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();

    // Title
    ctx.fillStyle = '#2F3061';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('KINETIC TEXT HOLDER', mx + mw / 2, my + 15);

    // Liquid Text Window
    const winW = mw * 0.85;
    const winH = 65;
    const winX = mx + (mw - winW) / 2;
    const winY = my + 38;

    ctx.fillStyle = this.isHeld ? '#74B9FF' : '#0984E3';
    this.roundRect(ctx, winX, winY, winW, winH, 10);
    ctx.fill();

    // Render Jiggling Letter Characters
    const charSpacing = winW / (this.words.length + 1);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.words.forEach((w, idx) => {
      const cx = winX + charSpacing * (idx + 1) + w.offsetX;
      const cy = winY + winH / 2 + w.offsetY;
      ctx.fillText(w.char, cx, cy);
    });

    // Hold Button below
    const btnW = mw * 0.7;
    const btnH = 35;
    const btnX = mx + (mw - btnW) / 2;
    const btnY = my + mh - 42;

    ctx.save();
    if (this.isHeld) {
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#FF7675';
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#D63031';
    }

    ctx.strokeStyle = '#2F3061';
    ctx.lineWidth = 3;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isHeld ? 'LIQUIDIZING...' : 'HOLD TO JIGGLE', btnX + btnW / 2, btnY + btnH / 2);

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const btnW = mw * 0.8;
    const btnH = 45;
    const btnX = mx + (mw - btnW) / 2;
    const btnY = my + mh - 50;

    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.isHeld = true;
      this.haptics.lightTap();
      this.audio.play('busyboard:kinetic_hold');
      return true;
    }
    return false;
  }

  public handlePointerMove(): void {}

  public handlePointerUp(): void {
    if (this.isHeld) {
      this.isHeld = false;
      this.words.forEach(w => {
        w.offsetX = 0;
        w.offsetY = 0;
      });
      this.haptics.lightTap();
    }
  }

  public update(): void {
    if (this.isHeld) {
      // Apply liquid jiggle oscillation
      this.words.forEach(w => {
        w.offsetX = (Math.random() - 0.5) * 8;
        w.offsetY = (Math.random() - 0.5) * 8;
      });

      if (Math.random() < 0.1) {
        this.haptics.lightTap();
      }
    }
  }

  public destroy(): void {}

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
