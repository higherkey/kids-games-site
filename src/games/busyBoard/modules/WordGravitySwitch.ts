import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export interface LetterBlock {
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  size: number;
}

export class WordGravitySwitch implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isGravityOn = false;
  private blocks: LetterBlock[] = [];
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

    const text = 'GRAVITY';
    for (let i = 0; i < text.length; i++) {
      this.blocks.push({
        char: text[i],
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 40,
        vy: 0,
        angle: 0,
        vAngle: (Math.random() - 0.5) * 0.1,
        size: 24,
      });
    }
  }

  public init(): void {}

  public isGravityActive(): boolean {
    return this.isGravityOn;
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
    ctx.fillText('WORD GRAVITY', mx + mw / 2, my + 15);

    // Glass Chamber Area
    const chamberW = mw * 0.85;
    const chamberH = mh - 90;
    const chamberX = mx + (mw - chamberW) / 2;
    const chamberY = my + 38;

    ctx.fillStyle = '#100E17';
    this.roundRect(ctx, chamberX, chamberY, chamberW, chamberH, 10);
    ctx.fill();

    // Render Blocks inside Chamber
    ctx.save();
    ctx.beginPath();
    ctx.rect(chamberX, chamberY, chamberW, chamberH);
    ctx.clip();

    this.blocks.forEach((b, idx) => {
      // If gravity off and resting, position linearly
      let bx = b.x;
      let by = b.y;

      if (!this.isGravityOn && b.y === 0) {
        bx = chamberX + 20 + idx * 26;
        by = chamberY + chamberH / 2;
      }

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(b.angle);

      // Block Square Body
      ctx.fillStyle = '#E17055';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      this.roundRect(ctx, -b.size / 2, -b.size / 2, b.size, b.size, 5);
      ctx.fill();
      ctx.stroke();

      // Letter inside
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.char, 0, 0);

      ctx.restore();
    });

    ctx.restore();

    // Rocker Switch below chamber
    const swW = 70;
    const swH = 30;
    const swX = mx + (mw - swW) / 2;
    const swY = my + mh - 42;

    ctx.fillStyle = '#2D3436';
    this.roundRect(ctx, swX, swY, swW, swH, 6);
    ctx.fill();

    // Rocker state
    ctx.fillStyle = this.isGravityOn ? '#FF7675' : '#00CEC9';
    const activeX = this.isGravityOn ? swX + swW / 2 : swX + 2;
    this.roundRect(ctx, activeX, swY + 2, swW / 2 - 2, swH - 4, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isGravityOn ? 'FALL' : 'FLOAT', swX + swW / 2, swY + swH / 2);
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const swW = 80;
    const swH = 40;
    const swX = mx + (mw - swW) / 2;
    const swY = my + mh - 45;

    if (x >= swX && x <= swX + swW && y >= swY && y <= swY + swH) {
      this.isGravityOn = !this.isGravityOn;
      this.haptics.heavyImpact();
      this.audio.play('busyboard:gravity_toggle');

      if (!this.isGravityOn) {
        // Reset blocks position
        const chamberW = mw * 0.85;
        const chamberH = mh - 90;
        const chamberX = mx + (mw - chamberW) / 2;
        const chamberY = my + 38;

        this.blocks.forEach((b, idx) => {
          b.x = chamberX + 20 + idx * 26;
          b.y = chamberY + chamberH / 2;
          b.vx = 0;
          b.vy = 0;
          b.angle = 0;
        });
      }

      return true;
    }
    return false;
  }

  public handlePointerMove(): void {}
  public handlePointerUp(): void {}

  public update(dt: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isGravityOn) return;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const chamberW = mw * 0.85;
    const chamberH = mh - 90;
    const chamberX = mx + (mw - chamberW) / 2;
    const chamberY = my + 38;

    const gravity = 800; // px/s^2

    this.blocks.forEach(b => {
      if (b.x === 0 && b.y === 0) {
        b.x = chamberX + chamberW / 2;
        b.y = chamberY + 20;
      }

      b.vy += gravity * (dt / 1000);
      b.x += b.vx * (dt / 1000);
      b.y += b.vy * (dt / 1000);
      b.angle += b.vAngle;

      // Rigid floor collision
      const floorY = chamberY + chamberH - b.size / 2;
      if (b.y >= floorY) {
        b.y = floorY;
        b.vy = -b.vy * 0.4; // bounce dampening
        b.vx *= 0.8;
        b.vAngle *= 0.5;

        if (Math.abs(b.vy) > 50) {
          this.haptics.lightTap();
        }
      }

      // Walls collision
      if (b.x <= chamberX + b.size / 2) {
        b.x = chamberX + b.size / 2;
        b.vx = -b.vx * 0.5;
      } else if (b.x >= chamberX + chamberW - b.size / 2) {
        b.x = chamberX + chamberW - b.size / 2;
        b.vx = -b.vx * 0.5;
      }
    });
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
