import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export class FontWeightMorph implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private weightValue = 0.5; // 0 (Thin 100) to 1 (Black 900)
  private isDragging = false;
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

  public getFontWeight(): number {
    return Math.round(100 + this.weightValue * 800); // 100 to 900
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
    ctx.fillText('FONT WEIGHT MORPH', mx + mw / 2, my + 15);

    // Live Morphing Text Display Box
    const dispW = mw * 0.85;
    const dispH = 50;
    const dispX = mx + (mw - dispW) / 2;
    const dispY = my + 38;

    ctx.fillStyle = '#2D3436';
    this.roundRect(ctx, dispX, dispY, dispW, dispH, 8);
    ctx.fill();

    // Morphing text with dynamic stroke to simulate weight
    const weight = this.getFontWeight();
    ctx.fillStyle = '#FDCB6E';
    ctx.font = `${weight} 26px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KIPU', dispX + dispW / 2, dispY + dispH / 2);

    if (this.weightValue > 0.4) {
      ctx.strokeStyle = '#FDCB6E';
      ctx.lineWidth = (this.weightValue - 0.4) * 4;
      ctx.strokeText('KIPU', dispX + dispW / 2, dispY + dispH / 2);
    }

    // Slider Track
    const trackW = mw * 0.8;
    const trackH = 12;
    const trackX = mx + (mw - trackW) / 2;
    const trackY = my + mh - 35;

    ctx.fillStyle = '#DFE6E9';
    this.roundRect(ctx, trackX, trackY, trackW, trackH, 6);
    ctx.fill();

    // Active track fill
    const activeW = this.weightValue * trackW;
    ctx.fillStyle = '#6C5CE7';
    this.roundRect(ctx, trackX, trackY, activeW, trackH, 6);
    ctx.fill();

    // Slider Knob
    const knobX = trackX + activeW;
    const knobY = trackY + trackH / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = this.isDragging ? '#A29BFE' : '#FFFFFF';
    ctx.strokeStyle = '#2F3061';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    ctx.restore();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const trackW = mw * 0.8;
    const trackX = mx + (mw - trackW) / 2;
    const trackY = my + mh - 35;

    if (x >= trackX - 15 && x <= trackX + trackW + 15 && Math.abs(y - trackY) <= 25) {
      this.isDragging = true;
      this.updateValueFromPointer(x, trackX, trackW);
      this.haptics.lightTap();
      this.audio.play('busyboard:weight_slide');
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

    const prevWeight = this.getFontWeight();
    this.updateValueFromPointer(x, trackX, trackW);
    const newWeight = this.getFontWeight();

    if (Math.abs(prevWeight - newWeight) >= 100) {
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(): void {
    this.isDragging = false;
  }

  private updateValueFromPointer(x: number, trackX: number, trackW: number): void {
    const clampedX = Math.max(trackX, Math.min(trackX + trackW, x));
    this.weightValue = (clampedX - trackX) / trackW;
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
