import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export class PitchRibbon implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isDragging = false;
  private ribbonValue = 0.5; // Normalized 0 to 1
  private frequency = 440;   // 220Hz - 880Hz
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
  }

  public init(): void {}

  public getFrequency(): number {
    return this.frequency;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    // Outer Module Frame
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

    // Label
    ctx.fillStyle = '#2F3061';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PITCH RIBBON', mx + mw / 2, my + 15);

    // Frequency Readout
    ctx.fillStyle = '#6C5CE7';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${Math.round(this.frequency)} Hz`, mx + mw / 2, my + 34);

    // Ribbon Track
    const trackW = mw * 0.8;
    const trackH = 30;
    const trackX = mx + (mw - trackW) / 2;
    const trackY = my + (mh - trackH) / 2 + 10;

    // Track Background Gradient
    const trackGrad = ctx.createLinearGradient(trackX, trackY, trackX + trackW, trackY);
    trackGrad.addColorStop(0, '#FF7675');
    trackGrad.addColorStop(0.5, '#74B9FF');
    trackGrad.addColorStop(1, '#A29BFE');

    ctx.fillStyle = trackGrad;
    this.roundRect(ctx, trackX, trackY, trackW, trackH, 15);
    ctx.fill();

    // Track Lines / Frets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    const frets = 8;
    for (let i = 1; i < frets; i++) {
      const fx = trackX + (trackW / frets) * i;
      ctx.beginPath();
      ctx.moveTo(fx, trackY + 4);
      ctx.lineTo(fx, trackY + trackH - 4);
      ctx.stroke();
    }

    // Slider Handle Indicator
    const handleX = trackX + this.ribbonValue * trackW;
    const handleY = trackY + trackH / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = this.isDragging ? '#FD79A8' : '#FFFFFF';
    ctx.strokeStyle = '#2F3061';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Handle center pin
    ctx.fillStyle = '#2F3061';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const trackW = mw * 0.8;
    const trackH = 40; // slightly wider hit area
    const trackX = mx + (mw - trackW) / 2;
    const trackY = my + (mh - trackH) / 2 + 10;

    if (x >= trackX - 15 && x <= trackX + trackW + 15 && y >= trackY - 10 && y <= trackY + trackH + 10) {
      this.isDragging = true;
      this.updateValueFromPointer(x, trackX, trackW);
      this.haptics.lightTap();
      this.audio.play('busyboard:pitch_ribbon');
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, _y: number, px: number, _py: number, pw: number, _ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const mx = px + margin;
    const mw = pw - margin * 2;
    const trackW = mw * 0.8;
    const trackX = mx + (mw - trackW) / 2;

    const prevFreqStep = Math.floor(this.frequency / 50);
    this.updateValueFromPointer(x, trackX, trackW);
    const newFreqStep = Math.floor(this.frequency / 50);

    if (prevFreqStep !== newFreqStep) {
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(): void {
    this.isDragging = false;
  }

  private updateValueFromPointer(x: number, trackX: number, trackW: number): void {
    const clampedX = Math.max(trackX, Math.min(trackX + trackW, x));
    this.ribbonValue = (clampedX - trackX) / trackW;
    this.frequency = 220 + this.ribbonValue * 660; // 220Hz to 880Hz
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
