import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export interface AlphabetBlock {
  char: string;
  isUpper: boolean;
}

export class CaseSwitcher implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isUppercase = true;
  private blocks: AlphabetBlock[] = [
    { char: 'A', isUpper: true },
    { char: 'B', isUpper: true },
    { char: 'C', isUpper: true },
    { char: 'D', isUpper: true },
  ];
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

  public isUpper(): boolean {
    return this.isUppercase;
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
    ctx.fillText('CASE SWITCHER', mx + mw / 2, my + 15);

    // Alphabet Blocks Window
    const winW = mw * 0.85;
    const winH = 55;
    const winX = mx + (mw - winW) / 2;
    const winY = my + 38;

    const blockW = (winW - 12) / this.blocks.length;

    this.blocks.forEach((b, idx) => {
      const bx = winX + idx * blockW + 2;
      const by = winY;
      const bw = blockW - 4;
      const bh = winH;

      ctx.save();
      ctx.fillStyle = b.isUpper ? '#6C5CE7' : '#A29BFE';
      ctx.strokeStyle = '#2D3436';
      ctx.lineWidth = 2;
      this.roundRect(ctx, bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayChar = b.isUpper ? b.char.toUpperCase() : b.char.toLowerCase();
      ctx.fillText(displayChar, bx + bw / 2, by + bh / 2);
      ctx.restore();
    });

    // Double-throw toggle switch
    const toggleW = 50;
    const toggleH = 26;
    const toggleX = mx + (mw - toggleW) / 2;
    const toggleY = my + mh - 35;

    ctx.fillStyle = '#2D3436';
    this.roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 13);
    ctx.fill();

    // Switch handle position
    const handleRadius = 11;
    const handleX = this.isUppercase ? toggleX + toggleW - handleRadius - 2 : toggleX + handleRadius + 2;
    const handleY = toggleY + toggleH / 2;

    ctx.fillStyle = this.isUppercase ? '#FD79A8' : '#00CEC9';
    ctx.beginPath();
    ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isUppercase ? 'AA' : 'aa', handleX, handleY);
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const toggleW = 70;
    const toggleH = 36;
    const toggleX = mx + (mw - toggleW) / 2;
    const toggleY = my + mh - 40;

    if (x >= toggleX && x <= toggleX + toggleW && y >= toggleY && y <= toggleY + toggleH) {
      this.isUppercase = !this.isUppercase;
      this.blocks.forEach(b => (b.isUpper = this.isUppercase));
      this.haptics.lightTap();
      this.audio.play(this.isUppercase ? 'busyboard:case_upper' : 'busyboard:case_lower');
      return true;
    }
    return false;
  }

  public handlePointerMove(): void {}
  public handlePointerUp(): void {}
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
