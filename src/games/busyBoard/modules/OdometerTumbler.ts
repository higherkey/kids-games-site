import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export interface OdometerReel {
  value: number;        // 0 to 9
  displayOffset: number;// fractional scroll offset (-0.5 to 0.5)
}

export class OdometerTumbler implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private reels: OdometerReel[] = [
    { value: 0, displayOffset: 0 },
    { value: 4, displayOffset: 0 },
    { value: 3, displayOffset: 0 },
  ];
  private activeReelIndex = -1;
  private dragStartY = 0;
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

  public getValues(): number[] {
    return this.reels.map(r => r.value);
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
    ctx.fillText('ODOMETER TUMBLER', mx + mw / 2, my + 15);

    // Mechanical Reel Window Housing
    const winW = mw * 0.8;
    const winH = 75;
    const winX = mx + (mw - winW) / 2;
    const winY = my + (mh - winH) / 2 + 10;

    ctx.fillStyle = '#1E2022';
    this.roundRect(ctx, winX, winY, winW, winH, 10);
    ctx.fill();

    // Render individual reels
    const reelW = (winW - 16) / this.reels.length;

    this.reels.forEach((reel, idx) => {
      const rx = winX + 8 + idx * reelW;
      const ry = winY + 6;
      const rw = reelW - 4;
      const rh = winH - 12;

      ctx.save();
      // Clip to reel slot
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();

      // Reel Background (black plastic drum)
      ctx.fillStyle = '#100E17';
      ctx.fillRect(rx, ry, rw, rh);

      // Drum gradient shadow
      const drumGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
      drumGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
      drumGrad.addColorStop(0.3, 'rgba(0,0,0,0)');
      drumGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      drumGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = drumGrad;

      // Reel Numbers (render prev, current, next)
      const numH = rh;
      const centerY = ry + rh / 2 + reel.displayOffset * numH;

      ctx.fillStyle = '#00FF66';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const prevNum = (reel.value + 9) % 10;
      const curNum = reel.value;
      const nextNum = (reel.value + 1) % 10;

      ctx.fillText(curNum.toString(), rx + rw / 2, centerY);
      ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
      ctx.fillText(prevNum.toString(), rx + rw / 2, centerY - numH);
      ctx.fillText(nextNum.toString(), rx + rw / 2, centerY + numH);

      ctx.fillStyle = drumGrad;
      ctx.fillRect(rx, ry, rw, rh);

      // Divider line between reels
      ctx.strokeStyle = '#3A3D42';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.restore();
    });
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const winW = mw * 0.8;
    const winH = 75;
    const winX = mx + (mw - winW) / 2;
    const winY = my + (mh - winH) / 2 + 10;

    const reelW = (winW - 16) / this.reels.length;

    this.reels.forEach((_reel, idx) => {
      const rx = winX + 8 + idx * reelW;
      const ry = winY + 6;
      const rw = reelW - 4;
      const rh = winH - 12;

      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
        this.activeReelIndex = idx;
        this.dragStartY = y;
      }
    });

    return this.activeReelIndex !== -1;
  }

  public handlePointerMove(_x: number, y: number, _px: number, _py: number, _pw: number, ph: number): void {
    if (this.activeReelIndex === -1) return;

    const dy = y - this.dragStartY;
    const reelH = ph * 0.25;
    const reel = this.reels[this.activeReelIndex];

    reel.displayOffset = dy / reelH;

    if (reel.displayOffset >= 0.5) {
      reel.value = (reel.value + 9) % 10; // Scroll down = decrement
      reel.displayOffset -= 1.0;
      this.dragStartY = y;
      this.haptics.lightTap();
      this.audio.play('busyboard:odometer_click');
    } else if (reel.displayOffset <= -0.5) {
      reel.value = (reel.value + 1) % 10; // Scroll up = increment
      reel.displayOffset += 1.0;
      this.dragStartY = y;
      this.haptics.lightTap();
      this.audio.play('busyboard:odometer_click');
    }
  }

  public handlePointerUp(): void {
    if (this.activeReelIndex !== -1) {
      const reel = this.reels[this.activeReelIndex];
      reel.displayOffset = 0;
      this.activeReelIndex = -1;
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
