import type { BusyBoardModule } from '../BusyBoardModule';
import { AudioController } from '../../../core/AudioController';
import { HapticController } from '../../../core/HapticController';

export class MorseTelegraphKey implements BusyBoardModule {
  public id: string;
  public x: number;
  public y: number;
  public w: number;
  public h: number;

  private isPressed = false;
  private pressStartTime = 0;
  private codeBuffer: string[] = []; // Array of '.' and '-'
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

  public getCodeBuffer(): string[] {
    return [...this.codeBuffer];
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

    // Title
    ctx.fillStyle = '#2F3061';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MORSE TELEGRAPH KEY', mx + mw / 2, my + 15);

    // Code Log Display Screen
    const dispW = mw * 0.85;
    const dispH = 26;
    const dispX = mx + (mw - dispW) / 2;
    const dispY = my + 38;

    ctx.fillStyle = '#100E17';
    this.roundRect(ctx, dispX, dispY, dispW, dispH, 6);
    ctx.fill();

    // Displayed morse code dots & dashes
    ctx.fillStyle = '#00FF66';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const recentCode = this.codeBuffer.slice(-12).join(' ');
    ctx.fillText(recentCode || '_', dispX + dispW / 2, dispY + dispH / 2 + 1);

    // Mechanical Brass Telegraph Lever
    const pivotX = mx + 40;
    const pivotY = my + mh - 35;
    const keyWidth = mw - 80;

    // Lever arm rotation when pressed
    const angle = this.isPressed ? 0.08 : 0;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);

    // Brass Arm
    ctx.fillStyle = '#D4AF37';
    ctx.strokeStyle = '#996515';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 0, -6, keyWidth, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Key Knob (Black bakelite disc on end of arm)
    const knobX = keyWidth - 10;
    ctx.fillStyle = this.isPressed ? '#1E2022' : '#3A3D42';
    ctx.strokeStyle = '#100E17';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(knobX, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Base Contact Post under knob
    const postX = pivotX + keyWidth - 10;
    const postY = pivotY + 12;
    ctx.fillStyle = '#718093';
    ctx.fillRect(postX - 6, postY, 12, 14);

    // Pivot Stand
    ctx.fillStyle = '#2F3640';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  public handlePointerDown(x: number, y: number, px: number, py: number, pw: number, ph: number): boolean {
    const margin = 10;
    const mx = px + margin;
    const my = py + margin;
    const mw = pw - margin * 2;
    const mh = ph - margin * 2;

    const pivotX = mx + 40;
    const keyWidth = mw - 80;
    const knobX = pivotX + keyWidth - 10;
    const knobY = my + mh - 35;

    // Hit test on Telegraph Knob / Arm area
    const dx = x - knobX;
    const dy = y - knobY;
    if (Math.sqrt(dx * dx + dy * dy) <= 35 || (x >= pivotX && x <= knobX && Math.abs(y - knobY) <= 25)) {
      this.isPressed = true;
      this.pressStartTime = Date.now();
      this.haptics.lightTap();
      this.audio.play('busyboard:morse_click');
      return true;
    }
    return false;
  }

  public handlePointerMove(): void {}

  public handlePointerUp(): void {
    if (this.isPressed) {
      this.isPressed = false;
      const duration = Date.now() - this.pressStartTime;

      // Dot vs Dash (< 200ms = dot '.', >= 200ms = dash '-')
      if (duration < 200) {
        this.codeBuffer.push('.');
      } else {
        this.codeBuffer.push('-');
      }

      if (this.codeBuffer.length > 20) {
        this.codeBuffer.shift();
      }

      this.haptics.lightTap();
      this.audio.play('busyboard:morse_release');
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
