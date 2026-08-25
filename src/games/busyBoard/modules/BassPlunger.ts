import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class BassPlunger implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isPressed = false;
  private pressDepression = 0; // 0 to 1
  private ripples: Ripple[] = [];
  private audio: AudioController;
  private haptics: HapticController;
  private game: any;

  constructor(id: string, x: number, y: number, w: number, h: number, game?: any) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
    this.game = game;
  }

  public init(): void {}

  public getRipples(): Ripple[] {
    return this.ripples;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Render local shockwave ripples
    this.ripples.forEach(ripple => {
      ctx.strokeStyle = `rgba(108, 92, 231, ${ripple.alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Outer Frame
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
    ctx.fillText('BASS PLUNGER', mx + mw / 2, my + 15);

    // Plunger Socket Collar
    const plungerX = mx + mw / 2;
    const plungerY = my + (mh / 2) + 10;
    const collarRadius = 45;

    ctx.fillStyle = '#2D3436';
    ctx.beginPath();
    ctx.arc(plungerX, plungerY, collarRadius, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Plunger Cap (depresses down on press)
    const capOffset = this.pressDepression * 8;
    const capRadius = collarRadius - 8 - capOffset;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    const capGrad = ctx.createRadialGradient(plungerX - 10, plungerY - 10, 5, plungerX, plungerY, capRadius);
    capGrad.addColorStop(0, '#A29BFE');
    capGrad.addColorStop(0.7, '#6C5CE7');
    capGrad.addColorStop(1, '#4834D4');

    ctx.fillStyle = capGrad;
    ctx.strokeStyle = '#2F3061';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(plungerX, plungerY, Math.max(10, capRadius), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Metallic Center Emblem
    ctx.fillStyle = '#DFE6E9';
    ctx.beginPath();
    ctx.arc(plungerX, plungerY, Math.max(4, capRadius * 0.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const plungerX = mx + mw / 2;
    const plungerY = my + (mh / 2) + 10;
    const collarRadius = 45;

    const dx = x - plungerX;
    const dy = y - plungerY;
    if (Math.sqrt(dx * dx + dy * dy) <= collarRadius) {
      this.isPressed = true;
      this.pressDepression = 1;
      this.haptics.heavyImpact();
      this.audio.play('busyboard:bass_plunge');

      // Add shockwave ripple
      this.ripples.push({
        x: plungerX,
        y: plungerY,
        radius: 10,
        maxRadius: Math.max(pw, ph) * 1.5,
        alpha: 1,
      });

      // Trigger board-wide screen shake if game reference exists
      if (this.game && typeof this.game.triggerShake === 'function') {
        this.game.triggerShake(300, 12);
      }

      return true;
    }
    return false;
  }

  public handlePointerMove(): void {}

  public handlePointerUp(): void {
    if (this.isPressed) {
      this.isPressed = false;
      this.haptics.lightTap();
    }
  }

  public update(dt: number): void {
    // Return depression spring
    if (!this.isPressed && this.pressDepression > 0) {
      this.pressDepression = Math.max(0, this.pressDepression - (dt / 1000) * 5);
    }

    // Expand ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += (dt / 1000) * 350;
      r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
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
