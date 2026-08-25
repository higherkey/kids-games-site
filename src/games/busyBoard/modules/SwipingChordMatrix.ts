import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export interface ChordBar {
  note: string;
  freq: number;
  color: string;
  isStrummed: boolean;
  strumIntensity: number; // 0 to 1 glow
}

export class SwipingChordMatrix implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private bars: ChordBar[] = [];
  private isSwiping = false;
  private lastSwipedIndex = -1;
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

    // Pentatonic / Chord notes
    this.bars = [
      { note: 'C4', freq: 261.63, color: '#FF7675', isStrummed: false, strumIntensity: 0 },
      { note: 'E4', freq: 329.63, color: '#FAB1A0', isStrummed: false, strumIntensity: 0 },
      { note: 'G4', freq: 392.00, color: '#FFEAA7', isStrummed: false, strumIntensity: 0 },
      { note: 'B4', freq: 493.88, color: '#55E6C1', isStrummed: false, strumIntensity: 0 },
      { note: 'D5', freq: 587.33, color: '#74B9FF', isStrummed: false, strumIntensity: 0 },
      { note: 'F#5', freq: 739.99, color: '#A29BFE', isStrummed: false, strumIntensity: 0 },
    ];
  }

  public init(): void {}

  public getBars(): ChordBar[] {
    return this.bars;
  }

  public render(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number): void {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

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
    ctx.fillText('SWIPING CHORD MATRIX', mx + mw / 2, my + 15);

    // Strumming Area Layout
    const matrixW = mw * 0.85;
    const matrixH = mh - 55;
    const matrixX = mx + (mw - matrixW) / 2;
    const matrixY = my + 42;

    const barW = matrixW / this.bars.length;

    this.bars.forEach((bar, idx) => {
      const bx = matrixX + idx * barW + 2;
      const bw = barW - 4;
      const by = matrixY;
      const bh = matrixH;

      ctx.save();

      // Glow effect if strummed
      if (bar.strumIntensity > 0) {
        ctx.shadowColor = bar.color;
        ctx.shadowBlur = 15 * bar.strumIntensity;
      }

      ctx.fillStyle = bar.color;
      this.roundRect(ctx, bx, by, bw, bh, 8);
      ctx.fill();

      // String line down the middle of bar
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by + 6);
      ctx.lineTo(bx + bw / 2, by + bh - 6);
      ctx.stroke();

      // Note label
      ctx.fillStyle = '#2D3436';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(bar.note, bx + bw / 2, by + bh - 8);

      ctx.restore();
    });
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const matrixW = mw * 0.85;
    const matrixH = mh - 55;
    const matrixX = mx + (mw - matrixW) / 2;
    const matrixY = my + 42;

    if (x >= matrixX && x <= matrixX + matrixW && y >= matrixY && y <= matrixY + matrixH) {
      this.isSwiping = true;
      this.strumBarAt(x, matrixX, matrixW);
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isSwiping) return;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const matrixW = mw * 0.85;
    const matrixH = mh - 55;
    const matrixX = mx + (mw - matrixW) / 2;
    const matrixY = my + 42;

    if (x >= matrixX && x <= matrixX + matrixW && y >= matrixY && y <= matrixY + matrixH) {
      this.strumBarAt(x, matrixX, matrixW);
    }
  }

  public handlePointerUp(): void {
    this.isSwiping = false;
    this.lastSwipedIndex = -1;
  }

  private strumBarAt(x: number, matrixX: number, matrixW: number): void {
    const barW = matrixW / this.bars.length;
    const index = Math.floor((x - matrixX) / barW);

    if (index >= 0 && index < this.bars.length && index !== this.lastSwipedIndex) {
      this.lastSwipedIndex = index;
      const bar = this.bars[index];
      bar.isStrummed = true;
      bar.strumIntensity = 1.0;

      this.haptics.lightTap();
      this.audio.play('busyboard:strum_chord');
    }
  }

  public update(dt: number): void {
    // Fade out strum glow
    this.bars.forEach(bar => {
      if (bar.strumIntensity > 0) {
        bar.strumIntensity = Math.max(0, bar.strumIntensity - (dt / 1000) * 3);
        if (bar.strumIntensity === 0) {
          bar.isStrummed = false;
        }
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
