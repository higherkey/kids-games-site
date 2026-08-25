import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export class SirenPullHandle implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isDragging = false;
  private pullDistance = 0; // 0 to 1 (0 = top resting, 1 = fully pulled down)
  private sirenPitch = 300; // 300Hz to 1200Hz
  private audio: AudioController;
  private haptics: HapticController;
  private dragStartY = 0;
  private initialPull = 0;

  constructor(id: string, x: number, y: number, w: number, h: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.audio = AudioController.getInstance();
    this.haptics = HapticController.getInstance();
  }

  public init(): void {}

  public getSirenPitch(): number {
    return this.sirenPitch;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Module Outer Frame
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

    // Title Label
    ctx.fillStyle = '#2F3061';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SIREN PULL-HANDLE', mx + mw / 2, my + 15);

    // Spring Slot Track
    const slotW = 16;
    const maxTravel = mh * 0.5;
    const slotX = mx + (mw - slotW) / 2;
    const slotY = my + 50;

    // Recessed Slot
    ctx.fillStyle = '#1E2022';
    this.roundRect(ctx, slotX, slotY, slotW, maxTravel + 20, 8);
    ctx.fill();

    // Coiled Spring inside slot (proportional to compression)
    const handleY = slotY + 10 + this.pullDistance * maxTravel;
    const springHeight = handleY - slotY;

    ctx.strokeStyle = '#E17055';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const coils = 10;
    for (let i = 0; i <= coils; i++) {
      const cy = slotY + (springHeight / coils) * i;
      const cx = slotX + slotW / 2 + (i % 2 === 0 ? -6 : 6);
      if (i === 0) ctx.moveTo(slotX + slotW / 2, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // T-Bar Handle
    const barW = mw * 0.6;
    const barH = 22;
    const barX = mx + (mw - barW) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 4;

    // Metal / Rubber T-Bar
    const barGrad = ctx.createLinearGradient(barX, handleY - barH / 2, barX, handleY + barH / 2);
    barGrad.addColorStop(0, '#D63031');
    barGrad.addColorStop(1, '#FF7675');

    ctx.fillStyle = barGrad;
    ctx.strokeStyle = '#2F3061';
    ctx.lineWidth = 3;
    this.roundRect(ctx, barX, handleY - barH / 2, barW, barH, 10);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Grip Ribs on Handle
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      const gx = mx + mw / 2 + i * 14;
      ctx.beginPath();
      ctx.moveTo(gx, handleY - barH / 2 + 4);
      ctx.lineTo(gx, handleY + barH / 2 - 4);
      ctx.stroke();
    }
    ctx.restore();

    // Siren Pitch Indicator Light / Glow
    const glowRadius = 8 + this.pullDistance * 6;
    ctx.fillStyle = `rgba(255, 118, 117, ${0.3 + this.pullDistance * 0.7})`;
    ctx.beginPath();
    ctx.arc(mx + mw / 2, my + 38, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const maxTravel = mh * 0.5;
    const slotY = my + 50;
    const handleY = slotY + 10 + this.pullDistance * maxTravel;
    const barW = mw * 0.7; // Generous hit width

    if (x >= mx + (mw - barW) / 2 && x <= mx + (mw + barW) / 2 && Math.abs(y - handleY) <= 30) {
      this.isDragging = true;
      this.dragStartY = y;
      this.initialPull = this.pullDistance;
      this.haptics.lightTap();
      this.audio.play('busyboard:siren_pull');
      return true;
    }
    return false;
  }

  public handlePointerMove(_x: number, y: number, _px: number, _py: number, _pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const mh = ph - margin * 2;
    const maxTravel = mh * 0.5;

    const dy = y - this.dragStartY;
    const deltaPull = dy / maxTravel;

    const newPull = Math.max(0, Math.min(1, this.initialPull + deltaPull));
    if (Math.abs(newPull - this.pullDistance) > 0.1) {
      this.haptics.lightTap();
    }
    this.pullDistance = newPull;
    this.sirenPitch = 300 + this.pullDistance * 900; // 300Hz to 1200Hz
  }

  public handlePointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.haptics.heavyImpact();
    }
  }

  public update(dt: number): void {
    // Spring return effect when released
    if (!this.isDragging && this.pullDistance > 0) {
      this.pullDistance = Math.max(0, this.pullDistance - (dt / 1000) * 3); // Return in ~330ms
      this.sirenPitch = 300 + this.pullDistance * 900;
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
