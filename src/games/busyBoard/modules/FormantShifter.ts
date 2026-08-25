import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export class FormantShifter implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private formantX = 0.5; // 0 (Bass/Dark 'Ah') to 1 (Treble/Bright 'Ee')
  private formantY = 0.5; // 0 (Deep 'Oh') to 1 (Squeaky 'Oo')
  private isDragging = false;
  private audio: AudioController;
  private haptics: HapticController;

  private vowels = ['AA', 'OH', 'EE', 'OO'];
  private currentVowel = 'AA';

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

  public getFormantParams() {
    return { formantX: this.formantX, formantY: this.formantY, vowel: this.currentVowel };
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
    ctx.fillText('FORMANT SHIFTER', mx + mw / 2, my + 15);

    // 2D Track Area
    const padMargin = 20;
    const padW = mw - padMargin * 2;
    const padH = mh - 70;
    const padX = mx + padMargin;
    const padY = my + 50;

    // Metallic / Dark 2D Surface
    ctx.fillStyle = '#2D3436';
    this.roundRect(ctx, padX, padY, padW, padH, 12);
    ctx.fill();

    // Grid overlays on pad
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let col = 1; col < 4; col++) {
      const gx = padX + (padW / 4) * col;
      ctx.beginPath();
      ctx.moveTo(gx, padY);
      ctx.lineTo(gx, padY + padH);
      ctx.stroke();
    }
    for (let row = 1; row < 4; row++) {
      const gy = padY + (padH / 4) * row;
      ctx.beginPath();
      ctx.moveTo(padX, gy);
      ctx.lineTo(padX + padW, gy);
      ctx.stroke();
    }

    // Corner Vowel Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AA', padX + 8, padY + 16);
    ctx.textAlign = 'right';
    ctx.fillText('EE', padX + padW - 8, padY + 16);
    ctx.textAlign = 'left';
    ctx.fillText('OH', padX + 8, padY + padH - 8);
    ctx.textAlign = 'right';
    ctx.fillText('OO', padX + padW - 8, padY + padH - 8);

    // Dynamic Touch / Puck Position
    const puckX = padX + this.formantX * padW;
    const puckY = padY + this.formantY * padH;

    // Glowing aura around puck
    const auraGrad = ctx.createRadialGradient(puckX, puckY, 2, puckX, puckY, 24);
    auraGrad.addColorStop(0, 'rgba(0, 206, 201, 0.6)');
    auraGrad.addColorStop(1, 'rgba(0, 206, 201, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(puckX, puckY, 24, 0, Math.PI * 2);
    ctx.fill();

    // Puck Body
    ctx.fillStyle = this.isDragging ? '#00CEC9' : '#81ECEC';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(puckX, puckY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vowel Text on Puck
    ctx.fillStyle = '#2D3436';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentVowel, puckX, puckY);
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const padMargin = 20;
    const padW = mw - padMargin * 2;
    const padH = mh - 70;
    const padX = mx + padMargin;
    const padY = my + 50;

    if (x >= padX && x <= padX + padW && y >= padY && y <= padY + padH) {
      this.isDragging = true;
      this.updateFormantFromPointer(x, y, padX, padY, padW, padH);
      this.haptics.lightTap();
      this.audio.play('busyboard:formant_shift');
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, y: number, px: number, py: number, pw: number, ph: number): void {
    if (!this.isDragging) return;

    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const padMargin = 20;
    const padW = mw - padMargin * 2;
    const padH = mh - 70;
    const padX = mx + padMargin;
    const padY = my + 50;

    const prevVowel = this.currentVowel;
    this.updateFormantFromPointer(x, y, padX, padY, padW, padH);

    if (prevVowel !== this.currentVowel) {
      this.haptics.lightTap();
    }
  }

  public handlePointerUp(): void {
    this.isDragging = false;
  }

  private updateFormantFromPointer(x: number, y: number, padX: number, padY: number, padW: number, padH: number): void {
    const clampedX = Math.max(padX, Math.min(padX + padW, x));
    const clampedY = Math.max(padY, Math.min(padY + padH, y));

    this.formantX = (clampedX - padX) / padW;
    this.formantY = (clampedY - padY) / padH;

    // Determine nearest vowel zone
    if (this.formantX < 0.5 && this.formantY < 0.5) this.currentVowel = 'AA';
    else if (this.formantX >= 0.5 && this.formantY < 0.5) this.currentVowel = 'EE';
    else if (this.formantX < 0.5 && this.formantY >= 0.5) this.currentVowel = 'OH';
    else this.currentVowel = 'OO';
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
